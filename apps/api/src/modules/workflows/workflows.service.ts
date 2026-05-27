import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MessageDirection,
  MessageStatus,
  PaymentStatus,
  Prisma,
  WorkflowDefinitionStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

type WorkflowDefinitionWithRelations = Prisma.WorkflowDefinitionGetPayload<{
  include: {
    steps: true;
    lastEditedBy: {
      select: {
        id: true;
        fullName: true;
        email: true;
      };
    };
    workflows: {
      select: {
        id: true;
        memberId: true;
        lastRunAt: true;
      };
    };
  };
}>;

type WorkflowMetrics = {
  memberCount: number;
  messagesSent: number;
  repliesReceived: number;
  paymentsReceived: number;
  recoveryRate: number;
};

type WorkflowMessageLog = Prisma.MessageLogGetPayload<{
  select: {
    direction: true;
    status: true;
    workflowStep: {
      select: {
        workflow: {
          select: {
            workflowDefinitionId: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  async list(organizationId: string) {
    this.tenantPrisma.assertOrganizationAccess(organizationId);
    const definitions = await this.findDefinitions();
    const roleByUserId = await this.findEditorRoles(
      organizationId,
      definitions,
    );
    const metricsByDefinitionId = await this.calculateMetrics(
      organizationId,
      definitions,
    );

    return definitions.map((definition) =>
      this.presentDefinition(
        definition,
        metricsByDefinitionId.get(definition.id) ?? this.emptyMetrics(),
        roleByUserId.get(definition.lastEditedById ?? ''),
      ),
    );
  }

  async create(organizationId: string, userId: string, dto: CreateWorkflowDto) {
    this.tenantPrisma.assertOrganizationAccess(organizationId);
    const now = new Date();
    const definition = await this.prisma.workflowDefinition.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        description: dto.description.trim(),
        category: dto.category.trim(),
        status: dto.status,
        trigger: dto.trigger.trim(),
        goal: dto.goal.trim(),
        audience: dto.audience.trim(),
        timezone: dto.timezone.trim(),
        startedAt: dto.status === WorkflowDefinitionStatus.ACTIVE ? now : null,
        lastEditedAt: now,
        lastEditedById: userId,
        steps: {
          create: dto.steps.map((step, index) => ({
            dayOffset: step.dayOffset,
            label: step.label.trim(),
            messageTemplate: step.messageTemplate.trim(),
            createsTask: step.createsTask ?? false,
            sortOrder: step.sortOrder ?? index,
          })),
        },
      },
      include: this.definitionInclude,
    });
    const roleByUserId = await this.findEditorRoles(organizationId, [
      definition,
    ]);

    return this.presentDefinition(
      definition,
      this.emptyMetrics(),
      roleByUserId.get(userId),
    );
  }

  async update(
    organizationId: string,
    workflowId: string,
    userId: string,
    dto: UpdateWorkflowDto,
  ) {
    this.tenantPrisma.assertOrganizationAccess(organizationId);
    const existingQuery =
      Prisma.validator<Prisma.WorkflowDefinitionFindFirstArgs>()({
        where: { id: workflowId },
        select: { id: true, status: true, startedAt: true },
      });
    const existing = await this.prisma.workflowDefinition.findFirst(
      this.tenantPrisma.scoped(existingQuery),
    );

    if (!existing) {
      throw new NotFoundException('Workflow not found');
    }

    const status = dto.status ?? existing.status;
    const now = new Date();
    const updated = await this.prisma.workflowDefinition.update({
      where: { id: existing.id },
      data: {
        status,
        startedAt:
          status === WorkflowDefinitionStatus.ACTIVE && !existing.startedAt
            ? now
            : existing.startedAt,
        lastEditedAt: now,
        lastEditedById: userId,
      },
      include: this.definitionInclude,
    });
    const [roleByUserId, metricsByDefinitionId] = await Promise.all([
      this.findEditorRoles(organizationId, [updated]),
      this.calculateMetrics(organizationId, [updated]),
    ]);

    return this.presentDefinition(
      updated,
      metricsByDefinitionId.get(updated.id) ?? this.emptyMetrics(),
      roleByUserId.get(userId),
    );
  }

  private async findDefinitions() {
    const query = Prisma.validator<Prisma.WorkflowDefinitionFindManyArgs>()({
      where: {},
      include: this.definitionInclude,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });

    return this.prisma.workflowDefinition.findMany(
      this.tenantPrisma.scoped(query),
    ) as Promise<WorkflowDefinitionWithRelations[]>;
  }

  private async findEditorRoles(
    organizationId: string,
    definitions: WorkflowDefinitionWithRelations[],
  ) {
    const userIds = Array.from(
      new Set(
        definitions
          .map((definition) => definition.lastEditedById)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    );

    if (userIds.length === 0) {
      return new Map<string, string>();
    }

    const memberships = await this.prisma.organizationMembership.findMany(
      this.tenantPrisma.scoped<Prisma.OrganizationMembershipFindManyArgs>({
        where: { userId: { in: userIds } },
        select: { userId: true, role: true },
      }),
    );

    return new Map(
      memberships.map((membership) => [membership.userId, membership.role]),
    );
  }

  private async calculateMetrics(
    organizationId: string,
    definitions: WorkflowDefinitionWithRelations[],
  ) {
    const definitionIds = definitions.map((definition) => definition.id);
    const metricsByDefinitionId = new Map<string, WorkflowMetrics>();

    for (const definition of definitions) {
      metricsByDefinitionId.set(definition.id, this.emptyMetrics());
      metricsByDefinitionId.get(definition.id)!.memberCount = new Set(
        definition.workflows.map((workflow) => workflow.memberId),
      ).size;
    }

    if (definitionIds.length === 0) {
      return metricsByDefinitionId;
    }

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const messageLogQuery = Prisma.validator<Prisma.MessageLogFindManyArgs>()({
      where: {
        createdAt: { gte: since },
        workflowStep: {
          workflow: {
            workflowDefinitionId: { in: definitionIds },
          },
        },
      },
      select: {
        direction: true,
        status: true,
        workflowStep: {
          select: {
            workflow: {
              select: { workflowDefinitionId: true },
            },
          },
        },
      },
    });
    const messageLogs = (await this.prisma.messageLog.findMany(
      this.tenantPrisma.scoped(messageLogQuery),
    )) as WorkflowMessageLog[];

    for (const log of messageLogs) {
      const definitionId = log.workflowStep?.workflow.workflowDefinitionId;
      const metrics = definitionId
        ? metricsByDefinitionId.get(definitionId)
        : undefined;

      if (!metrics) {
        continue;
      }

      if (
        log.direction === MessageDirection.OUTBOUND &&
        (log.status === MessageStatus.SENT ||
          log.status === MessageStatus.DELIVERED)
      ) {
        metrics.messagesSent += 1;
      }

      if (log.direction === MessageDirection.INBOUND) {
        metrics.repliesReceived += 1;
      }
    }

    const definitionIdsByMemberId = new Map<string, Set<string>>();

    for (const definition of definitions) {
      for (const workflow of definition.workflows) {
        const current =
          definitionIdsByMemberId.get(workflow.memberId) ?? new Set<string>();
        current.add(definition.id);
        definitionIdsByMemberId.set(workflow.memberId, current);
      }
    }

    const payments = await this.prisma.payment.findMany(
      this.tenantPrisma.scoped<Prisma.PaymentFindManyArgs>({
        where: {
          status: PaymentStatus.VERIFIED,
          verifiedAt: { gte: since },
          memberId: { in: Array.from(definitionIdsByMemberId.keys()) },
        },
        select: { memberId: true },
      }),
    );

    for (const payment of payments) {
      const paymentDefinitionIds = definitionIdsByMemberId.get(
        payment.memberId,
      );

      for (const definitionId of paymentDefinitionIds ?? []) {
        const metrics = metricsByDefinitionId.get(definitionId);

        if (metrics) {
          metrics.paymentsReceived += 1;
        }
      }
    }

    for (const metrics of metricsByDefinitionId.values()) {
      metrics.recoveryRate =
        metrics.messagesSent > 0
          ? Number(
              ((metrics.paymentsReceived / metrics.messagesSent) * 100).toFixed(
                1,
              ),
            )
          : 0;
    }

    return metricsByDefinitionId;
  }

  private presentDefinition(
    definition: WorkflowDefinitionWithRelations,
    metrics: WorkflowMetrics,
    editedByRole?: string,
  ) {
    const lastRunAt = definition.workflows.reduce<Date | null>(
      (latest, workflow) => {
        if (!workflow.lastRunAt) {
          return latest;
        }

        if (!latest || workflow.lastRunAt > latest) {
          return workflow.lastRunAt;
        }

        return latest;
      },
      null,
    );

    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      status: definition.status,
      trigger: definition.trigger,
      goal: definition.goal,
      audience: definition.audience,
      timezone: definition.timezone,
      startedAt: definition.startedAt,
      lastRunAt,
      lastEditedAt: definition.lastEditedAt,
      editedBy: definition.lastEditedBy
        ? {
            ...definition.lastEditedBy,
            role: editedByRole ?? null,
          }
        : null,
      metrics,

      steps: definition.steps.map((step) => ({
        id: step.id,
        dayOffset: step.dayOffset,
        label: step.label,
        messageTemplate: step.messageTemplate,
        createsTask: step.createsTask,
        sortOrder: step.sortOrder,
      })),
    };
  }

  private emptyMetrics(): WorkflowMetrics {
    return {
      memberCount: 0,
      messagesSent: 0,
      repliesReceived: 0,
      paymentsReceived: 0,
      recoveryRate: 0,
    };
  }

  private get definitionInclude() {
    return {
      steps: { orderBy: { sortOrder: 'asc' } },
      lastEditedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      workflows: {
        select: {
          id: true,
          memberId: true,
          lastRunAt: true,
        },
      },
    } satisfies Prisma.WorkflowDefinitionInclude;
  }
}
