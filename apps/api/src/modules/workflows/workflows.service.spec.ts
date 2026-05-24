/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { WorkflowDefinitionStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { WorkflowsService } from './workflows.service';

const createPrisma = () => ({
  workflowDefinition: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  organizationMembership: {
    findMany: jest.fn(),
  },
  messageLog: {
    findMany: jest.fn(),
  },
  payment: {
    findMany: jest.fn(),
  },
});

const definition = {
  id: 'definition-1',
  organizationId: 'org-1',
  name: 'Expired Card Retry',
  description: 'Retry failed payments due to expired cards',
  category: 'Payment',
  status: WorkflowDefinitionStatus.DRAFT,
  trigger: 'Payment fails due to expired card',
  goal: 'Recover failed payments',
  audience: 'Members with expired cards',
  timezone: 'Africa/Lagos (WAT)',
  startedAt: null,
  lastEditedAt: new Date('2026-05-24T10:00:00.000Z'),
  lastEditedById: 'user-1',
  createdAt: new Date('2026-05-24T10:00:00.000Z'),
  updatedAt: new Date('2026-05-24T10:00:00.000Z'),
  lastEditedBy: {
    id: 'user-1',
    fullName: 'John Adebayo',
    email: 'john@example.com',
  },
  workflows: [],
  steps: [
    {
      id: 'definition-step-1',
      workflowDefinitionId: 'definition-1',
      dayOffset: 0,
      label: 'Card failure notice',
      messageTemplate: 'Update card',
      createsTask: false,
      sortOrder: 0,
      createdAt: new Date('2026-05-24T10:00:00.000Z'),
      updatedAt: new Date('2026-05-24T10:00:00.000Z'),
    },
  ],
};

describe('WorkflowsService', () => {
  it('lists persisted workflow definitions scoped to an organization without fallback data', async () => {
    const prisma = createPrisma();
    prisma.workflowDefinition.findMany.mockResolvedValue([]);
    const service = new WorkflowsService(prisma as unknown as PrismaService);

    await expect(service.list('org-1')).resolves.toEqual([]);

    expect(prisma.workflowDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org-1' },
      }),
    );
  });

  it('creates a draft definition with ordered steps and editor metadata', async () => {
    const prisma = createPrisma();
    prisma.workflowDefinition.create.mockResolvedValue(definition);
    prisma.organizationMembership.findMany.mockResolvedValue([
      { userId: 'user-1', role: 'OWNER' },
    ]);
    const service = new WorkflowsService(prisma as unknown as PrismaService);

    await expect(
      service.create('org-1', 'user-1', {
        name: 'Expired Card Retry',
        description: 'Retry failed payments due to expired cards',
        category: 'Payment',
        status: WorkflowDefinitionStatus.DRAFT,
        trigger: 'Payment fails due to expired card',
        goal: 'Recover failed payments',
        audience: 'Members with expired cards',
        timezone: 'Africa/Lagos (WAT)',
        steps: [
          {
            dayOffset: 0,
            label: 'Card failure notice',
            messageTemplate: 'Update card',
          },
        ],
      }),
    ).resolves.toMatchObject({
      id: 'definition-1',
      status: WorkflowDefinitionStatus.DRAFT,
      editedBy: { role: 'OWNER' },
      metrics: {
        memberCount: 0,
        messagesSent: 0,
        repliesReceived: 0,
        paymentsReceived: 0,
        recoveryRate: 0,
      },
    });

    expect(prisma.workflowDefinition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          lastEditedById: 'user-1',
          startedAt: null,
          steps: {
            create: [
              expect.objectContaining({
                dayOffset: 0,
                label: 'Card failure notice',
                sortOrder: 0,
              }),
            ],
          },
        }),
      }),
    );
  });

  it('updates only the selected tenant workflow definition status', async () => {
    const prisma = createPrisma();
    prisma.workflowDefinition.findFirst.mockResolvedValue({
      id: 'definition-1',
      status: WorkflowDefinitionStatus.PAUSED,
      startedAt: null,
    });
    prisma.workflowDefinition.update.mockResolvedValue({
      ...definition,
      status: WorkflowDefinitionStatus.ACTIVE,
      startedAt: new Date('2026-05-24T10:00:00.000Z'),
    });
    prisma.organizationMembership.findMany.mockResolvedValue([
      { userId: 'user-1', role: 'OWNER' },
    ]);
    prisma.messageLog.findMany.mockResolvedValue([]);
    prisma.payment.findMany.mockResolvedValue([]);
    const service = new WorkflowsService(prisma as unknown as PrismaService);

    await expect(
      service.update('org-1', 'definition-1', 'user-1', {
        status: WorkflowDefinitionStatus.ACTIVE,
      }),
    ).resolves.toMatchObject({ status: WorkflowDefinitionStatus.ACTIVE });

    expect(prisma.workflowDefinition.findFirst).toHaveBeenCalledWith({
      where: { id: 'definition-1', organizationId: 'org-1' },
      select: { id: true, status: true, startedAt: true },
    });
    expect(prisma.workflowDefinition.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'definition-1' },
        data: expect.objectContaining({
          status: WorkflowDefinitionStatus.ACTIVE,
          lastEditedById: 'user-1',
        }),
      }),
    );
  });
});
