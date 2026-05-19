import { Injectable } from '@nestjs/common';
import { MemberStatus, MembershipStatus, PaymentStatus } from '@prisma/client';

export type MembershipStateSnapshot = {
  id?: string;
  expiryDate: Date;
  status?: MembershipStatus;
};

export type PaymentStateSnapshot = {
  membershipId?: string | null;
  status: PaymentStatus;
  verifiedAt?: Date | null;
};

export type MemberStateSnapshot = {
  currentStatus?: MemberStatus;
  memberships: MembershipStateSnapshot[];
  payments?: PaymentStateSnapshot[];
};

@Injectable()
export class MembershipStateService {
  private readonly expiringSoonWindowDays = 5;
  private readonly atRiskAfterDays = 7;
  private readonly churnedAfterDays = 30;

  calculateMemberStatus(
    member: MemberStateSnapshot,
    asOf: Date = new Date(),
  ): MemberStatus {
    const latestMembership = this.latestMembership(member.memberships);

    if (!latestMembership) {
      return member.currentStatus ?? MemberStatus.ACTIVE;
    }

    const relevantPayments = this.relevantPayments(
      member.payments ?? [],
      latestMembership.id,
    );

    if (
      relevantPayments.some(
        (payment) => payment.status === PaymentStatus.PENDING_VERIFICATION,
      )
    ) {
      return MemberStatus.PENDING_VERIFICATION;
    }

    if (
      latestMembership.status === MembershipStatus.EXPIRED &&
      relevantPayments.some(
        (payment) =>
          payment.status === PaymentStatus.VERIFIED &&
          payment.verifiedAt != null &&
          this.daysBetween(latestMembership.expiryDate, payment.verifiedAt) >=
            0,
      )
    ) {
      return MemberStatus.ACTIVE;
    }

    const daysUntilExpiry = this.daysBetween(asOf, latestMembership.expiryDate);

    if (this.detectExpiringSoon(daysUntilExpiry)) {
      return MemberStatus.EXPIRING;
    }

    if (this.markChurned(daysUntilExpiry)) {
      return MemberStatus.CHURNED;
    }

    if (this.markAtRisk(daysUntilExpiry)) {
      return MemberStatus.AT_RISK;
    }

    if (this.detectOverdue(daysUntilExpiry)) {
      return MemberStatus.OVERDUE;
    }

    return MemberStatus.ACTIVE;
  }

  calculateMembershipStatus(
    membership: MembershipStateSnapshot,
    asOf: Date = new Date(),
  ): MembershipStatus {
    return this.daysBetween(asOf, membership.expiryDate) < 0
      ? MembershipStatus.EXPIRED
      : MembershipStatus.ACTIVE;
  }

  detectExpiringSoon(daysUntilExpiry: number): boolean {
    return (
      daysUntilExpiry >= 0 && daysUntilExpiry <= this.expiringSoonWindowDays
    );
  }

  detectOverdue(daysUntilExpiry: number): boolean {
    const daysPastExpiry = Math.abs(daysUntilExpiry);

    return daysUntilExpiry < 0 && daysPastExpiry <= this.atRiskAfterDays;
  }

  markAtRisk(daysUntilExpiry: number): boolean {
    const daysPastExpiry = Math.abs(daysUntilExpiry);

    return (
      daysUntilExpiry < 0 &&
      daysPastExpiry > this.atRiskAfterDays &&
      daysPastExpiry <= this.churnedAfterDays
    );
  }

  markChurned(daysUntilExpiry: number): boolean {
    return (
      daysUntilExpiry < 0 && Math.abs(daysUntilExpiry) > this.churnedAfterDays
    );
  }

  private latestMembership(memberships: MembershipStateSnapshot[]) {
    return [...memberships].sort(
      (left, right) => right.expiryDate.getTime() - left.expiryDate.getTime(),
    )[0];
  }

  private relevantPayments(
    payments: PaymentStateSnapshot[],
    membershipId: string | undefined,
  ) {
    if (!membershipId) {
      return payments;
    }

    return payments.filter(
      (payment) =>
        payment.membershipId === membershipId || payment.membershipId == null,
    );
  }

  private daysBetween(start: Date, end: Date) {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    return Math.round(
      (this.toDateOnlyUtc(end).getTime() -
        this.toDateOnlyUtc(start).getTime()) /
        millisecondsPerDay,
    );
  }

  private toDateOnlyUtc(date: Date) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
