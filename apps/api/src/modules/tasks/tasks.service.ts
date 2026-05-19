import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus, TaskType, TimelineEventType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
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

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, query: ListTasksQuery) {
    return this.prisma.task.findMany({
      where: {
        organizationId,
        status: query.status,
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        member: true,
        assignedTo: true,
      },
    });
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
        type: input.type,
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
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const task = await this.prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
          organizationId,
          memberId: member.id,
          type: dto.type,
          assignedToId: dto.assignedToId,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
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
    const existingTask = await this.get(organizationId, taskId);

    const task = await this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: existingTask.id },
        data: {
          status: dto.status,
          assignedToId: dto.assignedToId,
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

  private async get(organizationId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId },
      include: {
        member: true,
        assignedTo: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }
}
