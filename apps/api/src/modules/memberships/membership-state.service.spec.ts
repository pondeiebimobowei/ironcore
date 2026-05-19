import { MemberStatus, MembershipStatus, PaymentStatus } from '@prisma/client';
import { MembershipStateService } from './membership-state.service';

describe('MembershipStateService', () => {
  const service = new MembershipStateService();
  const asOf = new Date('2026-05-19T10:00:00.000Z');

  const daysFromNow = (days: number) => {
    const date = new Date(asOf);
    date.setUTCDate(date.getUTCDate() + days);
    return date;
  };

  it('marks memberships expiring within five days as expiring', () => {
    expect(
      service.calculateMemberStatus(
        { memberships: [{ expiryDate: daysFromNow(5) }] },
        asOf,
      ),
    ).toBe(MemberStatus.EXPIRING);
  });

  it('keeps memberships with more than five days remaining active', () => {
    expect(
      service.calculateMemberStatus(
        { memberships: [{ expiryDate: daysFromNow(6) }] },
        asOf,
      ),
    ).toBe(MemberStatus.ACTIVE);
  });

  it('marks recently expired memberships as overdue', () => {
    expect(
      service.calculateMemberStatus(
        { memberships: [{ expiryDate: daysFromNow(-1) }] },
        asOf,
      ),
    ).toBe(MemberStatus.OVERDUE);
  });

  it('marks memberships overdue by more than seven days as at risk', () => {
    expect(
      service.calculateMemberStatus(
        { memberships: [{ expiryDate: daysFromNow(-8) }] },
        asOf,
      ),
    ).toBe(MemberStatus.AT_RISK);
  });

  it('marks memberships overdue by more than thirty days as churned', () => {
    expect(
      service.calculateMemberStatus(
        { memberships: [{ expiryDate: daysFromNow(-31) }] },
        asOf,
      ),
    ).toBe(MemberStatus.CHURNED);
  });

  it('uses the latest membership when a member has multiple memberships', () => {
    expect(
      service.calculateMemberStatus(
        {
          memberships: [
            { expiryDate: daysFromNow(-31) },
            { expiryDate: daysFromNow(12) },
          ],
        },
        asOf,
      ),
    ).toBe(MemberStatus.ACTIVE);
  });

  it('prioritizes pending payment verification over date-based risk', () => {
    expect(
      service.calculateMemberStatus(
        {
          memberships: [{ id: 'membership-1', expiryDate: daysFromNow(-8) }],
          payments: [
            {
              membershipId: 'membership-1',
              status: PaymentStatus.PENDING_VERIFICATION,
            },
          ],
        },
        asOf,
      ),
    ).toBe(MemberStatus.PENDING_VERIFICATION);
  });

  it('does not treat an old verified payment as a renewal after expiry', () => {
    expect(
      service.calculateMemberStatus(
        {
          memberships: [
            {
              id: 'membership-1',
              expiryDate: daysFromNow(-8),
              status: MembershipStatus.EXPIRED,
            },
          ],
          payments: [
            {
              membershipId: 'membership-1',
              status: PaymentStatus.VERIFIED,
              verifiedAt: daysFromNow(-20),
            },
          ],
        },
        asOf,
      ),
    ).toBe(MemberStatus.AT_RISK);
  });

  it('calculates membership status from the expiry date', () => {
    expect(
      service.calculateMembershipStatus({ expiryDate: daysFromNow(-1) }, asOf),
    ).toBe(MembershipStatus.EXPIRED);
    expect(
      service.calculateMembershipStatus({ expiryDate: daysFromNow(0) }, asOf),
    ).toBe(MembershipStatus.ACTIVE);
  });
});
