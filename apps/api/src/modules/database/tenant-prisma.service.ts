import { ForbiddenException, Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { requireOrganizationId } from '../auth/require-organization-id';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { PrismaService } from './prisma.service';

@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: AuthenticatedRequest,
  ) {}

  assertOrganizationAccess(organizationId: string) {
    if (organizationId !== this.organizationId()) {
      throw new ForbiddenException(
        'Tenant-scoped access does not match the authenticated organization.',
      );
    }
  }

  organizationId() {
    return requireOrganizationId(this.request);
  }

  scoped<TArgs>(args: TArgs): TArgs {
    const scopedArgs = args as TArgs & {
      where?: Record<string, unknown>;
    };

    return {
      ...scopedArgs,
      where: {
        ...(scopedArgs.where ?? {}),
        organizationId: this.organizationId(),
      },
    };
  }
}
