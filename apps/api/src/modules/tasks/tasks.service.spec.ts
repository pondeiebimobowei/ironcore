/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  OrganizationMembershipStatus,
  TaskPriority,
  TaskStatus,
  TaskType,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksService } from './tasks.service';

type ScopedArgs = {
  where?: Record<string, unknown>;
} & Record<string, unknown>;

function createService() {
  const tx = {
    task: {
      create: jest.fn().mockResolvedValue({
        id: 'task-1',
        type: TaskType.FOLLOW_UP_MEMBER,
        status: TaskStatus.OPEN,
      }),
    },
    timelineEvent: {
      create: jest.fn(),
    },
  };
  const prisma = {
    member: {
      findFirst: jest.fn().mockResolvedValue({ id: 'member-1' }),
    },
    organizationMembership: {
      findFirst: jest.fn().mockResolvedValue({ id: 'membership-1' }),
    },
    task: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'task-1',
        organizationId: 'org-1',
        memberId: 'member-1',
        title: 'Call overdue member',
        descriptionHtml: '<p>Use WhatsApp first.</p>',
        type: TaskType.FOLLOW_UP_MEMBER,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.OPEN,
        dueDate: new Date('2026-05-25T09:00:00.000Z'),
        member: { id: 'member-1' },
        assignedTo: { id: 'user-1', email: 'owner@example.com' },
      }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(tx)),
  } as unknown as PrismaService;
  const tenantPrisma = {
    assertOrganizationAccess: jest.fn(),
    scoped: jest.fn((args: ScopedArgs) => ({
      ...args,
      where: {
        ...(args.where ?? {}),
        organizationId: 'org-1',
      },
    })),
  };

  return {
    service: new TasksService(prisma, tenantPrisma as never),
    prisma: prisma as unknown as {
      member: { findFirst: jest.Mock };
      organizationMembership: { findFirst: jest.Mock };
      task: { findFirst: jest.Mock; findMany: jest.Mock };
      $transaction: jest.Mock;
    },
    tenantPrisma: tenantPrisma,
    tx,
  };
}

describe('TasksService', () => {
  it('creates a valid manual task with sanitized rich text and a scoped assignee', async () => {
    const { service, prisma, tx } = createService();

    await service.create('org-1', {
      title: 'Call overdue member',
      descriptionHtml:
        '<p onclick="x()">Use <strong>WhatsApp</strong>.</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>',
      memberId: 'member-1',
      type: TaskType.FOLLOW_UP_MEMBER,
      priority: TaskPriority.MEDIUM,
      assignedToId: 'user-1',
      dueDate: '2026-05-25T09:00:00.000Z',
    });

    expect(prisma.organizationMembership.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: OrganizationMembershipStatus.ACTIVE,
        organizationId: 'org-1',
      },
      select: { id: true },
    });
    expect(tx.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        memberId: 'member-1',
        title: 'Call overdue member',
        descriptionHtml: '<p>Use <strong>WhatsApp</strong>.</p><a>bad</a>',
        type: TaskType.FOLLOW_UP_MEMBER,
        priority: TaskPriority.MEDIUM,
        assignedToId: 'user-1',
        dueDate: new Date('2026-05-25T09:00:00.000Z'),
      }),
    });
    expect(tx.timelineEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        memberId: 'member-1',
        type: TimelineEventType.TASK_CREATED,
      }),
    });
  });

  it('rejects assignees outside the organization', async () => {
    const { service, prisma } = createService();
    prisma.organizationMembership.findFirst.mockResolvedValue(null);

    await expect(
      service.create('org-1', {
        title: 'Call overdue member',
        memberId: 'member-1',
        type: TaskType.FOLLOW_UP_MEMBER,
        priority: TaskPriority.MEDIUM,
        assignedToId: 'user-2',
        dueDate: '2026-05-25T09:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects rich text descriptions over 2,000 characters', async () => {
    const { service } = createService();

    await expect(
      service.create('org-1', {
        title: 'Call overdue member',
        descriptionHtml: `<p>${'a'.repeat(2001)}</p>`,
        memberId: 'member-1',
        type: TaskType.FOLLOW_UP_MEMBER,
        priority: TaskPriority.MEDIUM,
        dueDate: '2026-05-25T09:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('adds title and priority defaults to generated tasks', async () => {
    const { service, tx } = createService();

    await service.createGeneratedTask({
      tx: tx as unknown as Parameters<
        TasksService['createGeneratedTask']
      >[0]['tx'],
      organizationId: 'org-1',
      memberId: 'member-1',
      type: TaskType.VERIFY_PAYMENT,
      dueDate: new Date('2026-05-25T09:00:00.000Z'),
      source: 'payment_created',
    });

    expect(tx.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Verify payment',
        priority: TaskPriority.HIGH,
      }),
    });
  });
});

describe('CreateTaskDto validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  function validate(payload: Record<string, unknown>) {
    return pipe.transform(payload, {
      type: 'body',
      metatype: CreateTaskDto,
    });
  }

  it('rejects missing required fields', async () => {
    await expect(validate({})).rejects.toThrow();
  });

  it('rejects overlong titles', async () => {
    await expect(
      validate({
        title: 'a'.repeat(151),
        memberId: 'member-1',
        type: TaskType.FOLLOW_UP_MEMBER,
        priority: TaskPriority.MEDIUM,
        dueDate: '2026-05-25T09:00:00.000Z',
      }),
    ).rejects.toThrow();
  });

  it('rejects invalid enum values and unknown fields', async () => {
    await expect(
      validate({
        title: 'Call overdue member',
        memberId: 'member-1',
        type: 'BAD_TYPE',
        priority: TaskPriority.MEDIUM,
        dueDate: '2026-05-25T09:00:00.000Z',
        unexpected: true,
      }),
    ).rejects.toThrow();
  });
});
