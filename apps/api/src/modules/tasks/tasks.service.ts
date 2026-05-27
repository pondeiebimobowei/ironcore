import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrganizationMembershipStatus,
  Prisma,
  TaskPriority,
  TaskStatus,
  TaskType,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

type ListTasksQuery = {
  status?: TaskStatus;
};

type TaskTransaction = Pick<Prisma.TransactionClient, 'task' | 'timelineEvent'>;

type EnsureOpenTaskInput = {
  tx: TaskTransaction;
  organizationId: string;
  memberId: string;
  type: TaskType;
  dueDate?: Date;
  source: string;
  metadata?: Record<string, unknown>;
};

type CreateGeneratedTaskInput = EnsureOpenTaskInput;

const taskTitles: Record<TaskType, string> = {
  [TaskType.VERIFY_PAYMENT]: 'Verify payment',
  [TaskType.FOLLOW_UP_MEMBER]: 'Follow up with member',
  [TaskType.RESOLVE_OVERDUE_STATUS]: 'Resolve overdue status',
  [TaskType.REVIEW_AT_RISK_MEMBER]: 'Review at-risk member',
  [TaskType.REACTIVATION]: 'Start reactivation',
};

const generatedTaskPriorities: Record<TaskType, TaskPriority> = {
  [TaskType.VERIFY_PAYMENT]: TaskPriority.HIGH,
  [TaskType.FOLLOW_UP_MEMBER]: TaskPriority.LOW,
  [TaskType.RESOLVE_OVERDUE_STATUS]: TaskPriority.HIGH,
  [TaskType.REVIEW_AT_RISK_MEMBER]: TaskPriority.HIGH,
  [TaskType.REACTIVATION]: TaskPriority.MEDIUM,
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  list(organizationId: string, query: ListTasksQuery) {
    this.tenantPrisma.assertOrganizationAccess(organizationId);

    return this.prisma.task.findMany(
      this.tenantPrisma.scoped<Prisma.TaskFindManyArgs>({
        where: {
          status: query.status,
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        include: {
          member: true,
          assignedTo: true,
        },
      }),
    );
  }

  listOpenTasks(organizationId: string) {
    return this.list(organizationId, { status: TaskStatus.OPEN });
  }

  async ensureOpenTask(input: EnsureOpenTaskInput) {
    const existingTask = await input.tx.task.findFirst({
      where: {
        organizationId: input.organizationId,
        memberId: input.memberId,
        type: input.type,
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    if (existingTask) {
      return existingTask;
    }

    return this.createGeneratedTask(input);
  }

  async createGeneratedTask(input: CreateGeneratedTaskInput) {
    const task = await input.tx.task.create({
      data: {
        organizationId: input.organizationId,
        memberId: input.memberId,
        title: taskTitles[input.type],
        type: input.type,
        priority: generatedTaskPriorities[input.type],
        dueDate: input.dueDate,
      },
    });

    await input.tx.timelineEvent.create({
      data: {
        organizationId: input.organizationId,
        memberId: input.memberId,
        type: TimelineEventType.TASK_CREATED,
        metadata: {
          taskId: task.id,
          type: task.type,
          source: input.source,
          ...input.metadata,
        },
      },
    });

    return task;
  }

  async create(organizationId: string, dto: CreateTaskDto) {
    this.tenantPrisma.assertOrganizationAccess(organizationId);

    const [member, assignedToId] = await Promise.all([
      this.prisma.member.findFirst(
        this.tenantPrisma.scoped<Prisma.MemberFindFirstArgs>({
          where: { id: dto.memberId, deletedAt: null },
          select: { id: true },
        }),
      ),
      this.validateAssignee(organizationId, dto.assignedToId),
    ]);

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const descriptionHtml = this.validateDescription(dto.descriptionHtml);

    const task = await this.prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
          organizationId,
          memberId: member.id,
          title: dto.title,
          descriptionHtml,
          type: dto.type,
          priority: dto.priority,
          assignedToId,
          dueDate: new Date(dto.dueDate),
        },
      });

      await tx.timelineEvent.create({
        data: {
          organizationId,
          memberId: member.id,
          type: TimelineEventType.TASK_CREATED,
          metadata: {
            taskId: createdTask.id,
            type: createdTask.type,
            source: 'manual_task_create',
          },
        },
      });

      return createdTask;
    });

    return this.get(organizationId, task.id);
  }

  async update(organizationId: string, taskId: string, dto: UpdateTaskDto) {
    this.tenantPrisma.assertOrganizationAccess(organizationId);
    const existingTask = await this.get(organizationId, taskId);
    const assignedToId = await this.validateAssignee(
      organizationId,
      dto.assignedToId,
    );
    const descriptionHtml = this.validateDescription(dto.descriptionHtml);

    const task = await this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: existingTask.id },
        data: {
          title: dto.title,
          descriptionHtml,
          status: dto.status,
          priority: dto.priority,
          assignedToId,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        },
      });

      if (
        existingTask.status !== TaskStatus.COMPLETED &&
        dto.status === TaskStatus.COMPLETED
      ) {
        await tx.timelineEvent.create({
          data: {
            organizationId,
            memberId: existingTask.memberId,
            type: TimelineEventType.TASK_COMPLETED,
            metadata: {
              taskId: existingTask.id,
              source: 'task_update',
            },
          },
        });
      }

      return updatedTask;
    });

    return this.get(organizationId, task.id);
  }

  private async validateAssignee(
    organizationId: string,
    assignedToId?: string,
  ) {
    this.tenantPrisma.assertOrganizationAccess(organizationId);

    if (!assignedToId) {
      return undefined;
    }

    const membership = await this.prisma.organizationMembership.findFirst(
      this.tenantPrisma.scoped<Prisma.OrganizationMembershipFindFirstArgs>({
        where: {
          userId: assignedToId,
          status: OrganizationMembershipStatus.ACTIVE,
        },
        select: { id: true },
      }),
    );

    if (!membership) {
      throw new BadRequestException(
        'Assigned user must belong to this organization.',
      );
    }

    return assignedToId;
  }

  private validateDescription(descriptionHtml?: string) {
    const description = sanitizeTaskDescriptionHtml(descriptionHtml);

    if (!description) {
      return undefined;
    }

    if (plainTextFromHtml(description).length > 2000) {
      throw new BadRequestException(
        'Description must be 2,000 characters or fewer.',
      );
    }

    return description;
  }

  private async get(organizationId: string, taskId: string) {
    this.tenantPrisma.assertOrganizationAccess(organizationId);

    const task = await this.prisma.task.findFirst(
      this.tenantPrisma.scoped<Prisma.TaskFindFirstArgs>({
        where: { id: taskId },
        include: {
          member: true,
          assignedTo: true,
        },
      }),
    );

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }
}

function sanitizeTaskDescriptionHtml(descriptionHtml?: string) {
  if (!descriptionHtml?.trim()) {
    return undefined;
  }

  const withoutUnsafeBlocks = descriptionHtml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '');

  const sanitized = withoutUnsafeBlocks.replace(
    /<\/?([a-z][a-z0-9]*)([^>]*)>/gi,
    (tag, rawName: string, rawAttributes: string) => {
      const name = rawName.toLowerCase();
      const isClosingTag = tag.startsWith('</');
      const allowedTags = new Set([
        'p',
        'br',
        'strong',
        'b',
        'em',
        'i',
        'u',
        'ul',
        'ol',
        'li',
        'a',
      ]);

      if (!allowedTags.has(name)) {
        return '';
      }

      if (isClosingTag) {
        return name === 'br' ? '' : `</${name}>`;
      }

      if (name === 'br') {
        return '<br>';
      }

      if (name !== 'a') {
        return `<${name}>`;
      }

      const hrefMatch = rawAttributes.match(/\shref=(["'])(.*?)\1/i);
      const href = hrefMatch?.[2]?.trim();
      const safeHref =
        href && /^(https?:|mailto:|tel:)/i.test(href) ? href : '';

      return safeHref
        ? `<a href="${escapeAttribute(safeHref)}" target="_blank" rel="noreferrer">`
        : '<a>';
    },
  );

  return plainTextFromHtml(sanitized).trim() ? sanitized.trim() : undefined;
}

function plainTextFromHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
