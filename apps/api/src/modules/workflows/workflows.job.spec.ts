/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  JobRunStatus,
  WorkflowDefinitionStatus,
  WorkflowStatus,
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
});
