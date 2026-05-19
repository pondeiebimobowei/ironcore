import { Injectable } from '@nestjs/common';
import { JobRunStatus, MemberStatus, TaskType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { MembershipStateService } from '../memberships/membership-state.service';
import { TasksService } from '../tasks/tasks.service';
import { TimelineService } from '../timeline/timeline.service';

const MEMBER_STATE_JOB_NAME = 'member-state-update';
const MEMBER_STATE_ADVISORY_LOCK_ID = 88001;

type AdvisoryLockResult = {
  acquired: boolean;
};

type MemberStateJobResult = {
  skipped: boolean;
  processedCount: number;
  errorCount: number;
  jobRunId?: string;
  status?: JobRunStatus;
};

type MemberStateJobError = {
  memberId: string;
  message: string;
};

@Injectable()
export class MemberStateJob {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipStateService: MembershipStateService,
    private readonly tasksService: TasksService,
    private readonly timelineService: TimelineService,
  ) {}

  async run(asOf: Date = new Date()): Promise<MemberStateJobResult> {
    return this.prisma.$transaction(async (tx) => {
      const [lock] = await tx.$queryRaw<AdvisoryLockResult[]>`
        SELECT pg_try_advisory_lock(${MEMBER_STATE_ADVISORY_LOCK_ID}) AS acquired
      `;

      if (!lock?.acquired) {
        return { skipped: true, processedCount: 0, errorCount: 0 };
      }

      let jobRunId: string | undefined;
      let processedCount = 0;
      let errorCount = 0;

      try {
        const jobRun = await tx.jobRun.create({
          data: {
            jobName: MEMBER_STATE_JOB_NAME,
            status: JobRunStatus.RUNNING,
          },
        });
        jobRunId = jobRun.id;

        const members = await tx.member.findMany({
          where: { deletedAt: null },
          include: {
            memberships: true,
            payments: {
              select: {
                membershipId: true,
                status: true,
                verifiedAt: true,
              },
            },
          },
        });

        const errors: MemberStateJobError[] = [];

        for (const member of members) {
          processedCount += 1;

          try {
            const memberships = member.memberships.map((membership) => ({
              ...membership,
              status: this.membershipStateService.calculateMembershipStatus(
                membership,
                asOf,
              ),
            }));
            const targetMemberStatus =
              this.membershipStateService.calculateMemberStatus(
                {
                  currentStatus: member.status,
                  memberships,
                  payments: member.payments,
                },
                asOf,
              );

            for (const membership of memberships) {
              const currentMembership = member.memberships.find(
                (candidate) => candidate.id === membership.id,
              );

              if (currentMembership?.status !== membership.status) {
                await tx.membership.update({
                  where: { id: membership.id },
                  data: { status: membership.status },
                });
              }
            }

            if (member.status !== targetMemberStatus) {
              await tx.member.update({
                where: { id: member.id },
                data: { status: targetMemberStatus },
              });
              await this.timelineService.logMemberStatusChanged({
                tx,
                organizationId: member.organizationId,
                memberId: member.id,
                previousStatus: member.status,
                nextStatus: targetMemberStatus,
                source: MEMBER_STATE_JOB_NAME,
                jobRunId: jobRun.id,
              });
            }

            const taskType = this.taskTypeForMemberStatus(targetMemberStatus);

            if (taskType) {
              await this.tasksService.ensureOpenTask({
                tx,
                organizationId: member.organizationId,
                memberId: member.id,
                type: taskType,
                dueDate: asOf,
                source: MEMBER_STATE_JOB_NAME,
                metadata: {
                  status: targetMemberStatus,
                  jobRunId: jobRun.id,
                },
              });
            }
          } catch (error: unknown) {
            errors.push({
              memberId: member.id,
              message:
                error instanceof Error
                  ? error.message
                  : 'Unknown member state update error',
            });
          }
        }
        errorCount = errors.length;

        await tx.jobRun.update({
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
          await tx.jobRun.update({
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
                      : 'Unknown member state job error',
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
        await tx.$queryRaw`
          SELECT pg_advisory_unlock(${MEMBER_STATE_ADVISORY_LOCK_ID})
        `;
      }
    });
  }

  private taskTypeForMemberStatus(status: MemberStatus) {
    if (status === MemberStatus.OVERDUE) {
      return TaskType.RESOLVE_OVERDUE_STATUS;
    }

    if (status === MemberStatus.AT_RISK) {
      return TaskType.REVIEW_AT_RISK_MEMBER;
    }

    if (status === MemberStatus.CHURNED) {
      return TaskType.REACTIVATION;
    }

    return null;
  }
}
