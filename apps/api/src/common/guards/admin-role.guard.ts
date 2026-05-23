import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../modules/auth/types/authenticated-request.type';
import { hasOrganizationRole } from './organization-role';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return hasOrganizationRole(request.user?.role, [
      OrganizationRole.OWNER,
      OrganizationRole.ADMIN,
    ]);
  }
}
