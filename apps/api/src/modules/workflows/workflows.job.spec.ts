/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  JobRunStatus,
  TaskType,
  TimelineEventType,
  WorkflowDefinitionStatus,
  WorkflowStepStatus,
  WorkflowStatus,
  WorkflowType,
} from '@prisma/client';
import type { MessagingProvider } from '../../lib/messaging/provider';
import { PrismaService } from '../database/prisma.service';
import { WorkflowsJob } from './workflows.job';

describe('WorkflowsJob', () => {
  it('queries only active executions with active or legacy workflow definitions', async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ acquired: true }])
        .mockResolvedValueOnce([]),
      jobRun: {
        create: jest.fn().mockResolvedValue({ id: 'job-1' }),
        update: jest.fn(),
      },
      workflowStep: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const messagingProvider = {
      sendMessage: jest.fn(),
    } as unknown as MessagingProvider;
    const job = new WorkflowsJob(
      prisma as unknown as PrismaService,
      messagingProvider,
    );

    await expect(job.runDueWorkflowSteps()).resolves.toMatchObject({
      skipped: false,
      processedCount: 0,
      errorCount: 0,
      status: JobRunStatus.COMPLETED,
    });

    expect(prisma.workflowStep.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workflow: expect.objectContaining({
            status: WorkflowStatus.ACTIVE,
            OR: [
              { workflowDefinitionId: null },
              {
                workflowDefinition: {
                  status: WorkflowDefinitionStatus.ACTIVE,
                },
              },
            ],
          }),
        }),
      }),
    );
  });

  it('uses the step organization when creating follow-up tasks and timeline events', async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ acquired: true }])
        .mockResolvedValueOnce([]),
      jobRun: {
        create: jest.fn().mockResolvedValue({ id: 'job-1' }),
        update: jest.fn(),
      },
      workflowStep: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'step-1',
            organizationId: 'org-2',
            workflowId: 'workflow-1',
            dayOffset: 3,
            status: WorkflowStepStatus.PENDING,
            executedAt: null,
            messageTemplate: 'Hello {{firstName}}',
            workflow: {
              id: 'workflow-1',
              type: WorkflowType.OVERDUE_RECOVERY,
              triggerDate: new Date('2026-05-16T00:00:00.000Z'),
              memberId: 'member-2',
              member: {
                firstName: 'Ada',
                phoneNumber: '+2348012345678',
              },
            },
          },
        ]),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      messageLog: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      task: {
        create: jest.fn().mockResolvedValue({ id: 'task-1' }),
      },
      timelineEvent: {
        create: jest.fn(),
      },
      workflow: {
        update: jest.fn(),
      },
    };
    const messagingProvider = {
      sendMessage: jest.fn().mockResolvedValue({ status: 'sent' }),
    } as unknown as MessagingProvider;
    const job = new WorkflowsJob(
      prisma as unknown as PrismaService,
      messagingProvider,
    );

    await expect(
      job.runDueWorkflowSteps(new Date('2026-05-19T10:00:00.000Z')),
    ).resolves.toMatchObject({
      skipped: false,
      processedCount: 1,
      errorCount: 0,
      status: JobRunStatus.COMPLETED,
    });

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-2',
        memberId: 'member-2',
        type: TaskType.FOLLOW_UP_MEMBER,
      }),
    });
    expect(prisma.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-2',
        memberId: 'member-2',
        type: TimelineEventType.TASK_CREATED,
      }),
    });
  });
});
