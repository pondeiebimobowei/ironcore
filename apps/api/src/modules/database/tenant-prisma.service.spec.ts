import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantPrismaService } from './tenant-prisma.service';

function createService() {
  const prisma = {} as PrismaService;

  const request = {
    user: {
      organizationId: 'org-1',
    },
  };

  return {
    service: new TenantPrismaService(prisma, request as never),
    prisma,
  };
}

describe('TenantPrismaService', () => {
  it('injects organizationId into scoped member queries', () => {
    const { service } = createService();

    expect(
      service.scoped({
        where: {
          deletedAt: null,
        },
      }),
    ).toEqual({
      where: {
        deletedAt: null,
        organizationId: 'org-1',
      },
    });
  });

  it('rejects mismatched organization assertions', () => {
    const { service } = createService();

    expect(() => service.assertOrganizationAccess('org-2')).toThrow(
      ForbiddenException,
    );
  });
});
