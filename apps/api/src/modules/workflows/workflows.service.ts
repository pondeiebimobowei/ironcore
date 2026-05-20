import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkflowStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { defaultWorkflowTemplates } from './default-workflow-templates';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  getDefaultWorkflows() {
    return defaultWorkflowTemplates;
  }

  async list(organizationId: string) {
    const workflows = await this.prisma.workflow.findMany({
      where: { organizationId },
      orderBy: [{ nextRunAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        member: true,
        steps: { orderBy: { dayOffset: 'asc' } },
      },
    });

    if (workflows.length > 0) {
      return workflows;
    }

    return this.getDefaultWorkflows().map((template) => ({
      ...template,
      status: WorkflowStatus.ACTIVE,
    }));
  }

  async update(
    organizationId: string,
    workflowId: string,
    dto: UpdateWorkflowDto,
  ) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, organizationId },
      select: { id: true },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return this.prisma.workflow.update({
      where: { id: workflow.id },
      data: { status: dto.status },
      include: {
        member: true,
        steps: { orderBy: { dayOffset: 'asc' } },
      },
    });
  }
}
