import { OrganizationRole } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  email: string;
  role?: OrganizationRole;
  organizationId?: string;
  organizationMembershipId?: string;
};
