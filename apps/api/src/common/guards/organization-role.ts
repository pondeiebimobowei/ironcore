import { OrganizationRole } from '@prisma/client';

export function hasOrganizationRole(
  actualRole: OrganizationRole | undefined,
  allowedRoles: OrganizationRole[],
) {
  return actualRole ? allowedRoles.includes(actualRole) : false;
}
