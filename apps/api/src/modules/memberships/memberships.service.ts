import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MemberStatus,
  MembershipStatus,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { RenewMembershipDto } from './dto/renew-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    memberId: string,
    dto: CreateMembershipDto,
  ) {
    await this.ensureMember(organizationId, memberId);
    const plan = dto.planId
      ? await this.prisma.plan.findFirst({
          where: { id: dto.planId, organizationId },
        })
      : null;

    if (dto.planId && !plan) {
      throw new NotFoundException('Plan not found');
    }

    const membership = await this.prisma.$transaction(async (tx) => {
      const created = await tx.membership.create({
        data: {
          organizationId,
          memberId,
          planId: plan?.id,
          startDate: new Date(dto.startDate),
          expiryDate: new Date(dto.expiryDate),
          amount: dto.amount ?? plan?.amount ?? '0',
          currency: dto.currency ?? plan?.currency ?? 'NGN',
          status: MembershipStatus.ACTIVE,
        },
      });

      await tx.member.update({
        where: { id: memberId },
        data: { status: MemberStatus.ACTIVE },
      });
      await tx.timelineEvent.create({
        data: {
          organizationId,
          memberId,
          type: TimelineEventType.MEMBERSHIP_CREATED,
          metadata: { membershipId: created.id, source: 'manual_create' },
        },
      });

      return created;
    });

    return this.get(organizationId, membership.id);
  }

  async update(
    organizationId: string,
    membershipId: string,
    dto: UpdateMembershipDto,
  ) {
    const existing = await this.get(organizationId, membershipId);
    const plan = dto.planId
      ? await this.prisma.plan.findFirst({
          where: { id: dto.planId, organizationId },
        })
      : null;

    if (dto.planId && !plan) {
      throw new NotFoundException('Plan not found');
    }

    await this.prisma.$transaction([
      this.prisma.membership.update({
        where: { id: existing.id },
        data: {
          planId: dto.planId,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
          status: dto.status,
          amount: dto.amount,
          currency: dto.currency,
        },
      }),
      this.prisma.timelineEvent.create({
        data: {
          organizationId,
          memberId: existing.memberId,
          type: TimelineEventType.MEMBERSHIP_RENEWED,
          metadata: {
            membershipId: existing.id,
            source: 'manual_update',
          },
        },
      }),
    ]);

    return this.get(organizationId, membershipId);
  }

  async renew(
    organizationId: string,
    membershipId: string,
    dto: RenewMembershipDto,
  ) {
    const existing = await this.get(organizationId, membershipId);

    await this.prisma.$transaction([
      this.prisma.membership.update({
        where: { id: existing.id },
        data: {
          expiryDate: new Date(dto.expiryDate),
          status: MembershipStatus.ACTIVE,
          amount: dto.amount ?? existing.amount,
        },
      }),
      this.prisma.member.update({
        where: { id: existing.memberId },
        data: { status: MemberStatus.ACTIVE },
      }),
      this.prisma.timelineEvent.create({
        data: {
          organizationId,
          memberId: existing.memberId,
          type: TimelineEventType.MEMBERSHIP_RENEWED,
          metadata: {
            membershipId: existing.id,
            source: 'manual_renewal',
          },
        },
      }),
    ]);

    return this.get(organizationId, membershipId);
  }

  private async get(organizationId: string, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
      include: { plan: true, member: true },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return membership;
  }

  private async ensureMember(organizationId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }
  }
}
