/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method */
import {
  BillingCycle,
  MemberStatus,
  MembershipStatus,
  PaymentMethod,
  PaymentStatus,
  TaskPriority,
  TaskStatus,
  TaskType,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { PaymentsService } from './payments.service';

const createTransaction = () => ({
  payment: {
    create: jest.fn(),
    update: jest.fn(),
  },
  member: {
    update: jest.fn(),
  },
  membership: {
    create: jest.fn(),
    update: jest.fn(),
  },
  task: {
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  timelineEvent: {
    create: jest.fn(),
  },
});

const createService = (tx: ReturnType<typeof createTransaction>) => {
  const prisma = {
    $transaction: jest.fn((handler) => handler(tx)),
    member: {
      findFirst: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const tasksService = {
    createGeneratedTask: jest.fn(async (input) => {
      await input.tx.task.create({
        data: {
          organizationId: input.organizationId,
          memberId: input.memberId,
          title: 'Verify payment',
          type: input.type,
          priority: TaskPriority.HIGH,
          dueDate: input.dueDate,
        },
      });
      return { id: 'task-1' };
    }),
  } as unknown as jest.Mocked<TasksService>;

  return {
    service: new PaymentsService(prisma, tasksService),
    prisma: prisma as unknown as {
      member: { findFirst: jest.Mock };
      membership: { findFirst: jest.Mock };
      payment: { findFirst: jest.Mock; findMany: jest.Mock };
      $transaction: jest.Mock;
    },
    tasksService,
  };
};

describe('PaymentsService', () => {
  it('creates a pending payment, moves the member to pending verification, logs events, and creates a verification task', async () => {
    const tx = createTransaction();
    tx.payment.create.mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.PENDING_VERIFICATION,
    });
    const { service, prisma, tasksService } = createService(tx);
    prisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.OVERDUE,
      memberships: [{ id: 'membership-1' }],
    });
    prisma.membership.findFirst.mockResolvedValue({ id: 'membership-1' });
    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      memberId: 'member-1',
      membershipId: 'membership-1',
      status: PaymentStatus.PENDING_VERIFICATION,
      member: { id: 'member-1' },
      membership: { id: 'membership-1', plan: null },
    });

    await expect(
      service.createPendingPayment('org-1', {
        memberId: 'member-1',
        membershipId: 'membership-1',
        amountExpected: '85000',
        amountPaid: '85000',
        method: PaymentMethod.BANK_TRANSFER,
        reference: 'INV-1',
      }),
    ).resolves.toMatchObject({ id: 'payment-1' });

    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        memberId: 'member-1',
        membershipId: 'membership-1',
        status: PaymentStatus.PENDING_VERIFICATION,
        amountExpected: '85000',
        amountPaid: '85000',
        method: PaymentMethod.BANK_TRANSFER,
        reference: 'INV-1',
      }),
    });
    expect(tx.member.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { status: MemberStatus.PENDING_VERIFICATION },
    });
    expect(tx.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TimelineEventType.MEMBER_STATUS_CHANGED,
        metadata: expect.objectContaining({
          previousStatus: MemberStatus.OVERDUE,
          status: MemberStatus.PENDING_VERIFICATION,
          source: 'payment_created',
          paymentId: 'payment-1',
        }),
      }),
    });
    expect(tx.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TimelineEventType.PAYMENT_CREATED,
        metadata: {
          paymentId: 'payment-1',
          status: PaymentStatus.PENDING_VERIFICATION,
        },
      }),
    });
    expect(tasksService.createGeneratedTask).toHaveBeenCalledWith({
      tx,
      organizationId: 'org-1',
      memberId: 'member-1',
      type: TaskType.VERIFY_PAYMENT,
      dueDate: expect.any(Date),
      source: 'payment_created',
      metadata: {
        paymentId: 'payment-1',
        status: PaymentStatus.PENDING_VERIFICATION,
      },
    });
  });

  it('approves a payment, creates a renewal membership, logs events, and completes verification tasks', async () => {
    const tx = createTransaction();
    tx.payment.update.mockResolvedValue({ id: 'payment-1' });
    tx.membership.create.mockResolvedValue({ id: 'membership-renewal-1' });
    tx.task.findMany.mockResolvedValue([{ id: 'task-1' }, { id: 'task-2' }]);
    const { service, prisma } = createService(tx);
    prisma.payment.findFirst
      .mockResolvedValueOnce({
        id: 'payment-1',
        organizationId: 'org-1',
        memberId: 'member-1',
        membershipId: 'membership-1',
        amountExpected: '85000',
        amountPaid: null,
        status: PaymentStatus.PENDING_VERIFICATION,
        member: { id: 'member-1', status: MemberStatus.PENDING_VERIFICATION },
        membership: {
          id: 'membership-1',
          organizationId: 'org-1',
          memberId: 'member-1',
          planId: 'plan-1',
          startDate: new Date('2026-04-01T00:00:00.000Z'),
          expiryDate: new Date('2026-04-30T00:00:00.000Z'),
          status: MembershipStatus.EXPIRED,
          amount: '85000',
          currency: 'NGN',
          plan: {
            id: 'plan-1',
            billingCycle: BillingCycle.MONTHLY,
          },
        },
      })
      .mockResolvedValueOnce({
        id: 'payment-1',
        status: PaymentStatus.VERIFIED,
        member: { id: 'member-1' },
        membership: { id: 'membership-renewal-1', plan: null },
      });

    await expect(
      service.verifyPayment('org-1', 'payment-1', 'user-1'),
    ).resolves.toMatchObject({ status: PaymentStatus.VERIFIED });

    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: expect.objectContaining({
        status: PaymentStatus.VERIFIED,
        amountPaid: '85000',
        verifiedById: 'user-1',
        verifiedAt: expect.any(Date),
        rejectionReason: null,
      }),
    });
    expect(tx.membership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        memberId: 'member-1',
        planId: 'plan-1',
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        expiryDate: new Date('2026-05-31T00:00:00.000Z'),
        status: MembershipStatus.ACTIVE,
        amount: '85000',
        currency: 'NGN',
      }),
    });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { membershipId: 'membership-renewal-1' },
    });
    expect(tx.member.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { status: MemberStatus.ACTIVE },
    });
    expect(tx.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TimelineEventType.MEMBERSHIP_RENEWED,
        metadata: {
          paymentId: 'payment-1',
          previousMembershipId: 'membership-1',
          membershipId: 'membership-renewal-1',
          source: 'payment_verified',
        },
      }),
    });
    expect(tx.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TimelineEventType.PAYMENT_VERIFIED,
        metadata: { paymentId: 'payment-1', verifiedById: 'user-1' },
      }),
    });
    expect(tx.task.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        memberId: 'member-1',
        type: TaskType.VERIFY_PAYMENT,
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
      },
      select: { id: true },
    });
    expect(tx.task.update).toHaveBeenCalledTimes(2);
    expect(tx.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TimelineEventType.TASK_COMPLETED,
        metadata: expect.objectContaining({
          taskId: 'task-1',
          paymentId: 'payment-1',
          source: 'payment_verified',
        }),
      }),
    });
  });

  it('rejects a pending payment and logs the rejection without activating membership or member state', async () => {
    const tx = createTransaction();
    tx.payment.update.mockResolvedValue({ id: 'payment-1' });
    const { service, prisma } = createService(tx);
    prisma.payment.findFirst
      .mockResolvedValueOnce({
        id: 'payment-1',
        organizationId: 'org-1',
        memberId: 'member-1',
        membershipId: 'membership-1',
        status: PaymentStatus.PENDING_VERIFICATION,
        member: { id: 'member-1', status: MemberStatus.PENDING_VERIFICATION },
        membership: { id: 'membership-1', plan: null },
      })
      .mockResolvedValueOnce({
        id: 'payment-1',
        status: PaymentStatus.REJECTED,
        rejectionReason: 'Wrong amount',
        member: { id: 'member-1' },
        membership: { id: 'membership-1', plan: null },
      });

    await expect(
      service.rejectPayment('org-1', 'payment-1', ' Wrong amount '),
    ).resolves.toMatchObject({ status: PaymentStatus.REJECTED });

    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: {
        status: PaymentStatus.REJECTED,
        rejectionReason: 'Wrong amount',
      },
    });
    expect(tx.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: TimelineEventType.PAYMENT_REJECTED,
        metadata: { paymentId: 'payment-1', reason: 'Wrong amount' },
      }),
    });
    expect(tx.membership.update).not.toHaveBeenCalled();
    expect(tx.member.update).not.toHaveBeenCalled();
    expect(tx.task.update).not.toHaveBeenCalled();
  });
});
