import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingCycle,
  MemberStatus,
  MembershipStatus,
  PaymentMethod,
  PaymentStatus,
  TaskStatus,
  TaskType,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
  ) {}

  list(organizationId: string) {
    return this.prisma.payment.findMany({
      where: { organizationId },
      orderBy: [{ submittedAt: 'desc' }],
      include: {
        member: true,
        membership: { include: { plan: true } },
      },
    });
  }

  async get(organizationId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, organizationId },
      include: {
        member: true,
        membership: { include: { plan: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async createPendingPayment(organizationId: string, dto: CreatePaymentDto) {
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, organizationId, deletedAt: null },
      include: {
        memberships: {
          orderBy: { expiryDate: 'desc' },
          take: 1,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const membershipId = dto.membershipId ?? member.memberships[0]?.id;

    if (membershipId) {
      const membership = await this.prisma.membership.findFirst({
        where: { id: membershipId, organizationId, memberId: member.id },
      });

      if (!membership) {
        throw new NotFoundException('Membership not found');
      }
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          organizationId,
          memberId: member.id,
          membershipId,
          status: PaymentStatus.PENDING_VERIFICATION,
          amountExpected: dto.amountExpected,
          amountPaid: dto.amountPaid,
          proofUrl: dto.proofUrl,
          method: dto.method ?? PaymentMethod.BANK_TRANSFER,
          reference: dto.reference,
          notes: dto.notes,
        },
      });

      if (member.status !== MemberStatus.PENDING_VERIFICATION) {
        await tx.member.update({
          where: { id: member.id },
          data: { status: MemberStatus.PENDING_VERIFICATION },
        });
        await tx.timelineEvent.create({
          data: {
            organizationId,
            memberId: member.id,
            type: TimelineEventType.MEMBER_STATUS_CHANGED,
            metadata: {
              previousStatus: member.status,
              status: MemberStatus.PENDING_VERIFICATION,
              source: 'payment_created',
              paymentId: createdPayment.id,
            },
          },
        });
      }

      await tx.timelineEvent.create({
        data: {
          organizationId,
          memberId: member.id,
          type: TimelineEventType.PAYMENT_CREATED,
          metadata: {
            paymentId: createdPayment.id,
            status: createdPayment.status,
          },
        },
      });

      await this.tasksService.createGeneratedTask({
        tx,
        organizationId,
        memberId: member.id,
        type: TaskType.VERIFY_PAYMENT,
        dueDate: new Date(),
        source: 'payment_created',
        metadata: {
          paymentId: createdPayment.id,
          status: createdPayment.status,
        },
      });

      return createdPayment;
    });

    return this.get(organizationId, payment.id);
  }

  async verifyPayment(
    organizationId: string,
    paymentId: string,
    verifiedById: string,
  ) {
    const payment = await this.get(organizationId, paymentId);

    if (payment.status === PaymentStatus.VERIFIED) {
      throw new BadRequestException('Payment is already verified');
    }

    const verifiedPayment = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.VERIFIED,
          amountPaid: payment.amountPaid ?? payment.amountExpected,
          verifiedById,
          verifiedAt: new Date(),
          rejectionReason: null,
        },
      });

      if (payment.membershipId) {
        const renewalMembership = await tx.membership.create({
          data: this.renewalMembershipData(payment),
        });

        await tx.payment.update({
          where: { id: payment.id },
          data: { membershipId: renewalMembership.id },
        });

        await tx.timelineEvent.create({
          data: {
            organizationId,
            memberId: payment.memberId,
            type: TimelineEventType.MEMBERSHIP_RENEWED,
            metadata: {
              paymentId: payment.id,
              previousMembershipId: payment.membershipId,
              membershipId: renewalMembership.id,
              source: 'payment_verified',
            },
          },
        });
      }

      if (payment.member.status !== MemberStatus.ACTIVE) {
        await tx.member.update({
          where: { id: payment.memberId },
          data: { status: MemberStatus.ACTIVE },
        });
        await tx.timelineEvent.create({
          data: {
            organizationId,
            memberId: payment.memberId,
            type: TimelineEventType.MEMBER_STATUS_CHANGED,
            metadata: {
              previousStatus: payment.member.status,
              status: MemberStatus.ACTIVE,
              source: 'payment_verified',
              paymentId: payment.id,
            },
          },
        });
      }

      await tx.timelineEvent.create({
        data: {
          organizationId,
          memberId: payment.memberId,
          type: TimelineEventType.PAYMENT_VERIFIED,
          metadata: { paymentId: payment.id, verifiedById },
        },
      });

      const verificationTasks = await tx.task.findMany({
        where: {
          organizationId,
          memberId: payment.memberId,
          type: TaskType.VERIFY_PAYMENT,
          status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
        },
        select: { id: true },
      });

      for (const task of verificationTasks) {
        await tx.task.update({
          where: { id: task.id },
          data: { status: TaskStatus.COMPLETED },
        });
        await tx.timelineEvent.create({
          data: {
            organizationId,
            memberId: payment.memberId,
            type: TimelineEventType.TASK_COMPLETED,
            metadata: {
              taskId: task.id,
              paymentId: payment.id,
              source: 'payment_verified',
            },
          },
        });
      }

      return updatedPayment;
    });

    return this.get(organizationId, verifiedPayment.id);
  }

  async rejectPayment(
    organizationId: string,
    paymentId: string,
    reason: string,
  ) {
    const payment = await this.get(organizationId, paymentId);

    if (payment.status === PaymentStatus.VERIFIED) {
      throw new BadRequestException('Verified payments cannot be rejected');
    }

    const rejectedPayment = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REJECTED,
          rejectionReason: reason.trim(),
        },
      });

      await tx.timelineEvent.create({
        data: {
          organizationId,
          memberId: payment.memberId,
          type: TimelineEventType.PAYMENT_REJECTED,
          metadata: { paymentId: payment.id, reason: reason.trim() },
        },
      });

      return updatedPayment;
    });

    return this.get(organizationId, rejectedPayment.id);
  }

  private renewalMembershipData(
    payment: Awaited<ReturnType<PaymentsService['get']>>,
  ) {
    const previousMembership = payment.membership;

    if (!previousMembership) {
      throw new BadRequestException('Payment is not linked to a membership');
    }

    const startDate = this.addDays(previousMembership.expiryDate, 1);
    const expiryDate = this.addMembershipPeriod(
      startDate,
      previousMembership.plan?.billingCycle,
    );

    return {
      organizationId: payment.organizationId,
      memberId: payment.memberId,
      planId: previousMembership.planId,
      startDate,
      expiryDate,
      status: MembershipStatus.ACTIVE,
      amount: payment.amountPaid ?? payment.amountExpected,
      currency: previousMembership.currency,
    };
  }

  private addMembershipPeriod(startDate: Date, billingCycle?: BillingCycle) {
    const expiryDate = new Date(startDate);

    if (billingCycle === BillingCycle.QUARTERLY) {
      expiryDate.setMonth(expiryDate.getMonth() + 3);
    } else if (billingCycle === BillingCycle.ANNUAL) {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    expiryDate.setDate(expiryDate.getDate() - 1);

    return expiryDate;
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }
}
