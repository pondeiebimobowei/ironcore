import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedRequest } from './types/authenticated-request.type';

export function requireOrganizationId(req: AuthenticatedRequest) {
  const organizationId = req.user?.organizationId;

  if (!organizationId) {
    throw new BadRequestException('Organization setup is required');
  }

  return organizationId;
}
