import { JobRunStatus, MemberStatus, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { MembershipStateService } from '../memberships/membership-state.service';
import { TimelineService } from '../timeline/timeline.service';
import { MemberStateJob } from './member-state.job';

const asOf = new Date('2026-05-19T10:00:00.000Z');

const createTransaction = () => ({
  $queryRaw: jest
    .fn()
    .mockResolvedValueOnce([{ acquired: true }])
    .mockResolvedValueOnce([{ unlocked: true }]),
  jobRun: {
    create: jest.fn().mockResolvedValue({ id: 'job-run-1' }),
    update: jest.fn().mockResolvedValue({ id: 'job-run-1' }),
  },
  member: {
    findMany: jest.fn(),
    update: jest.fn().mockResolvedValue({ id: 'member-1' }),
  },
  membership: {
    update: jest.fn().mockResolvedValue({ id: 'membership-1' }),
  },
});

const createJob = (tx: ReturnType<typeof createTransaction>) => {
  const prisma = {
    $transaction: jest.fn((handler) => handler(tx)),
  } as unknown as PrismaService;

  const membershipStateService = {
    calculateMembershipStatus: jest.fn(),
    calculateMemberStatus: jest.fn(),
  } as unknown as jest.Mocked<MembershipStateService>;

  const timelineService = {
    logMemberStatusChanged: jest.fn().mockResolvedValue({ id: 'event-1' }),
  } as unknown as jest.Mocked<TimelineService>;

  return {
    job: new MemberStateJob(prisma, membershipStateService, timelineService),
    membershipStateService,
    timelineService,
  };
};

describe('MemberStateJob', () => {
  it('skips without creating a job run when the advisory lock is held', async () => {
    const tx = createTransaction();
    tx.$queryRaw.mockReset();
    tx.$queryRaw.mockResolvedValueOnce([{ acquired: false }]);
    const { job } = createJob(tx);

    await expect(job.run(asOf)).resolves.toEqual({
      skipped: true,
      processedCount: 0,
      errorCount: 0,
    });
    expect(tx.jobRun.create).not.toHaveBeenCalled();
    expect(tx.member.findMany).not.toHaveBeenCalled();
  });

  it('updates changed membership and member statuses and logs one timeline event', async () => {
    const tx = createTransaction();
    tx.member.findMany.mockResolvedValue([
      {
        id: 'member-1',
        organizationId: 'org-1',
        status: MemberStatus.ACTIVE,
        memberships: [
          {
            id: 'membership-1',
            expiryDate: new Date('2026-05-18T00:00:00.000Z'),
            status: MembershipStatus.ACTIVE,
          },
        ],
        payments: [],
      },
    ]);
    const { job, membershipStateService, timelineService } = createJob(tx);
    membershipStateService.calculateMembershipStatus.mockReturnValue(
      MembershipStatus.EXPIRED,
    );
    membershipStateService.calculateMemberStatus.mockReturnValue(
      MemberStatus.OVERDUE,
    );

    await expect(job.run(asOf)).resolves.toEqual({
      skipped: false,
      processedCount: 1,
      errorCount: 0,
      jobRunId: 'job-run-1',
      status: JobRunStatus.COMPLETED,
    });
    expect(tx.membership.update).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: { status: MembershipStatus.EXPIRED },
    });
    expect(tx.member.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { status: MemberStatus.OVERDUE },
    });
    expect(timelineService.logMemberStatusChanged).toHaveBeenCalledWith({
      tx,
      organizationId: 'org-1',
      memberId: 'member-1',
      previousStatus: MemberStatus.ACTIVE,
      nextStatus: MemberStatus.OVERDUE,
      source: 'member-state-update',
      jobRunId: 'job-run-1',
    });
    expect(tx.jobRun.update).toHaveBeenCalledWith({
      where: { id: 'job-run-1' },
      data: expect.objectContaining({
        processedCount: 1,
        errorCount: 0,
        errorLog: undefined,
        status: JobRunStatus.COMPLETED,
      }),
    });
  });

  it('does not log duplicate timeline events when the member status is unchanged', async () => {
    const tx = createTransaction();
    tx.member.findMany.mockResolvedValue([
      {
        id: 'member-1',
        organizationId: 'org-1',
        status: MemberStatus.OVERDUE,
        memberships: [
          {
            id: 'membership-1',
            expiryDate: new Date('2026-05-18T00:00:00.000Z'),
            status: MembershipStatus.EXPIRED,
          },
        ],
        payments: [],
      },
    ]);
    const { job, membershipStateService, timelineService } = createJob(tx);
    membershipStateService.calculateMembershipStatus.mockReturnValue(
      MembershipStatus.EXPIRED,
    );
    membershipStateService.calculateMemberStatus.mockReturnValue(
      MemberStatus.OVERDUE,
    );

    await expect(job.run(asOf)).resolves.toMatchObject({
      skipped: false,
      processedCount: 1,
      errorCount: 0,
      status: JobRunStatus.COMPLETED,
    });
    expect(tx.membership.update).not.toHaveBeenCalled();
    expect(tx.member.update).not.toHaveBeenCalled();
    expect(timelineService.logMemberStatusChanged).not.toHaveBeenCalled();
  });

  it('marks the job run partial when an individual member update fails', async () => {
    const tx = createTransaction();
    tx.member.findMany.mockResolvedValue([
      {
        id: 'member-1',
        organizationId: 'org-1',
        status: MemberStatus.ACTIVE,
        memberships: [
          {
            id: 'membership-1',
            expiryDate: new Date('2026-05-18T00:00:00.000Z'),
            status: MembershipStatus.ACTIVE,
          },
        ],
        payments: [],
      },
    ]);
    tx.member.update.mockRejectedValue(new Error('database write failed'));
    const { job, membershipStateService } = createJob(tx);
    membershipStateService.calculateMembershipStatus.mockReturnValue(
      MembershipStatus.EXPIRED,
    );
    membershipStateService.calculateMemberStatus.mockReturnValue(
      MemberStatus.OVERDUE,
    );

    await expect(job.run(asOf)).resolves.toEqual({
      skipped: false,
      processedCount: 1,
      errorCount: 1,
      jobRunId: 'job-run-1',
      status: JobRunStatus.PARTIAL,
    });
    expect(tx.jobRun.update).toHaveBeenCalledWith({
      where: { id: 'job-run-1' },
      data: expect.objectContaining({
        processedCount: 1,
        errorCount: 1,
        errorLog: [
          {
            memberId: 'member-1',
            message: 'database write failed',
          },
        ],
        status: JobRunStatus.PARTIAL,
      }),
    });
  });
});
