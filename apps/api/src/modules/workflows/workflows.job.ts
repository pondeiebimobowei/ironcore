import { Inject, Injectable } from '@nestjs/common';
import {
  JobRunStatus,
  MessageStatus,
  TaskType,
  TimelineEventType,
  WorkflowStepStatus,
  WorkflowStatus,
  WorkflowType,
} from '@prisma/client';
import { MESSAGING_PROVIDER } from '../../lib/messaging/provider';
import type { MessagingProvider } from '../../lib/messaging/provider';
import { PrismaService } from '../database/prisma.service';
import { defaultWorkflowTemplates } from './default-workflow-templates';

const WORKFLOW_JOB_NAME = 'run-workflow-steps';
const WORKFLOW_ADVISORY_LOCK_ID = 88002;
const MAX_RETRY_COUNT = 3;

type AdvisoryLockResult = {
  acquired: boolean;
};

type WorkflowJobResult = {
  skipped: boolean;
  processedCount: number;
  errorCount: number;
  jobRunId?: string;
  status?: JobRunStatus;
};

type WorkflowJobError = {
  workflowStepId: string;
  message: string;
};

@Injectable()
export class WorkflowsJob {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MESSAGING_PROVIDER)
    private readonly messagingProvider: MessagingProvider,
  ) {}

  async runDueWorkflowSteps(
    asOf: Date = new Date(),
  ): Promise<WorkflowJobResult> {
    const [lock] = await this.prisma.$queryRaw<AdvisoryLockResult[]>`
      SELECT pg_try_advisory_lock(${WORKFLOW_ADVISORY_LOCK_ID}) AS acquired
    `;

    if (!lock?.acquired) {
      return { skipped: true, processedCount: 0, errorCount: 0 };
    }

    let jobRunId: string | undefined;
    let processedCount = 0;
    let errorCount = 0;

    try {
      const jobRun = await this.prisma.jobRun.create({
        data: {
          jobName: WORKFLOW_JOB_NAME,
          status: JobRunStatus.RUNNING,
        },
      });
      jobRunId = jobRun.id;

      const dueSteps = (
        await this.prisma.workflowStep.findMany({
          where: {
            status: WorkflowStepStatus.PENDING,
            workflow: {
              status: WorkflowStatus.ACTIVE,
            },
          },
          include: {
            workflow: {
              include: {
                member: true,
              },
            },
          },
          orderBy: [{ createdAt: 'asc' }],
        })
      ).filter(
        (step) =>
          this.scheduledAt(step.workflow.triggerDate, step.dayOffset) <= asOf,
      );

      const errors: WorkflowJobError[] = [];

      for (const step of dueSteps) {
        processedCount += 1;

        try {
          if (await this.hasSentMessageLog(step.id)) {
            await this.prisma.workflowStep.update({
              where: { id: step.id },
              data: {
                status: WorkflowStepStatus.SENT,
                executedAt: step.executedAt ?? new Date(),
                errorMessage: null,
              },
            });
            continue;
          }

          const message = this.renderMessage(step.messageTemplate, {
            firstName: step.workflow.member.firstName,
          });
          const result = await this.messagingProvider.sendMessage({
            to: step.workflow.member.phoneNumber,
            message,
            metadata: {
              organizationId: step.organizationId,
              memberId: step.workflow.memberId,
              workflowStepId: step.id,
              jobRunId: jobRun.id,
            },
          });

          if (result.status === 'failed') {
            await this.markStepFailed({
              workflowStepId: step.id,
              organizationId: step.organizationId,
              memberId: step.workflow.memberId,
              message: result.error ?? 'Message send failed',
            });
            throw new Error(result.error ?? 'Message send failed');
          }

          await this.prisma.workflowStep.update({
            where: { id: step.id },
            data: {
              status: WorkflowStepStatus.SENT,
              executedAt: new Date(),
              errorMessage: null,
            },
          });

          if (this.shouldCreateTask(step.workflow.type, step.dayOffset)) {
            const task = await this.prisma.task.create({
              data: {
                organizationId: step.organizationId,
                memberId: step.workflow.memberId,
                type: TaskType.FOLLOW_UP_MEMBER,
                dueDate: new Date(),
              },
            });

            await this.prisma.timelineEvent.create({
              data: {
                organizationId: step.organizationId,
                memberId: step.workflow.memberId,
                type: TimelineEventType.TASK_CREATED,
                metadata: {
                  taskId: task.id,
                  workflowId: step.workflowId,
                  workflowStepId: step.id,
                  source: WORKFLOW_JOB_NAME,
                },
              },
            });
          }

          await this.prisma.workflow.update({
            where: { id: step.workflowId },
            data: {
              currentDayOffset: step.dayOffset,
              lastRunAt: new Date(),
              nextRunAt: null,
            },
          });
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unknown workflow step error';
          errors.push({ workflowStepId: step.id, message });
        }
      }

      errorCount = errors.length;
      await this.prisma.jobRun.update({
        where: { id: jobRun.id },
        data: {
          completedAt: new Date(),
          processedCount,
          errorCount,
          errorLog: errors.length > 0 ? errors : undefined,
          status:
            errors.length > 0 ? JobRunStatus.PARTIAL : JobRunStatus.COMPLETED,
        },
      });

      return {
        skipped: false,
        processedCount,
        errorCount,
        jobRunId: jobRun.id,
        status:
          errors.length > 0 ? JobRunStatus.PARTIAL : JobRunStatus.COMPLETED,
      };
    } catch (error: unknown) {
      errorCount += 1;

      if (jobRunId) {
        await this.prisma.jobRun.update({
          where: { id: jobRunId },
          data: {
            completedAt: new Date(),
            processedCount,
            errorCount,
            errorLog: [
              {
                message:
                  error instanceof Error
                    ? error.message
                    : 'Unknown workflow job error',
              },
            ],
            status: JobRunStatus.FAILED,
          },
        });
      }

      return {
        skipped: false,
        processedCount,
        errorCount,
        jobRunId,
        status: JobRunStatus.FAILED,
      };
    } finally {
      await this.prisma.$queryRaw`
        SELECT pg_advisory_unlock(${WORKFLOW_ADVISORY_LOCK_ID})
      `;
    }
  }

  private async markStepFailed(input: {
    workflowStepId: string;
    organizationId: string;
    memberId: string;
    message: string;
  }) {
    const step = await this.prisma.workflowStep.findUnique({
      where: { id: input.workflowStepId },
      select: { retryCount: true },
    });
    const retryCount = (step?.retryCount ?? 0) + 1;

    await this.prisma.workflowStep.update({
      where: { id: input.workflowStepId },
      data: {
        status: WorkflowStepStatus.FAILED,
        retryCount,
        errorMessage: input.message,
      },
    });

    if (retryCount >= MAX_RETRY_COUNT) {
      const task = await this.prisma.task.create({
        data: {
          organizationId: input.organizationId,
          memberId: input.memberId,
          type: TaskType.FOLLOW_UP_MEMBER,
          dueDate: new Date(),
        },
      });

      await this.prisma.timelineEvent.create({
        data: {
          organizationId: input.organizationId,
          memberId: input.memberId,
          type: TimelineEventType.TASK_CREATED,
          metadata: {
            taskId: task.id,
            workflowStepId: input.workflowStepId,
            source: WORKFLOW_JOB_NAME,
            reason: 'workflow_step_failed',
          },
        },
      });
    }
  }

  private scheduledAt(triggerDate: Date, dayOffset: number) {
    const scheduledAt = new Date(triggerDate);
    scheduledAt.setDate(scheduledAt.getDate() + dayOffset);

    return scheduledAt;
  }

  private async hasSentMessageLog(workflowStepId: string) {
    const sentLog = await this.prisma.messageLog.findFirst({
      where: {
        workflowStepId,
        status: MessageStatus.SENT,
      },
      select: { id: true },
    });

    return sentLog != null;
  }

  private renderMessage(
    template: string,
    variables: Record<string, string | undefined>,
  ) {
    return template.replaceAll(
      /\{\{(\w+)\}\}/g,
      (_, key: string) => variables[key] ?? '',
    );
  }

  private shouldCreateTask(type: WorkflowType, dayOffset: number) {
    return defaultWorkflowTemplates.some(
      (template) =>
        template.type === type &&
        template.steps.some(
          (step) => step.dayOffset === dayOffset && step.createsTask,
        ),
    );
  }
}
