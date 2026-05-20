import { Injectable, NotFoundException } from '@nestjs/common';
import {
  WorkflowStatus,
  WorkflowType,
  type Workflow,
  type WorkflowStep,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { defaultWorkflowTemplates } from './default-workflow-templates';

type WorkflowWithSteps = Workflow & { steps: WorkflowStep[] };

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  getDefaultWorkflows() {
    return defaultWorkflowTemplates.map((template) => ({
      id: `template:${template.type}`,
      name: template.name,
      type: template.type,
      status: WorkflowStatus.ACTIVE,
      description: this.workflowDescription(template.type),
      steps: template.steps.map((step) => ({
        id: `template:${template.type}:${step.dayOffset}`,
        dayOffset: step.dayOffset,
        messageTemplate: step.messageTemplate,
        createsTask: step.createsTask,
      })),
    }));
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
      return workflows.map((workflow) => this.presentWorkflow(workflow));
    }

    return this.getDefaultWorkflows();
  }

  async update(
    organizationId: string,
    workflowId: string,
    dto: UpdateWorkflowDto,
  ) {
    const templateType = workflowId.startsWith('template:')
      ? (workflowId.replace('template:', '') as WorkflowType)
      : null;

    if (
      templateType &&
      Object.values(WorkflowType).includes(templateType) &&
      defaultWorkflowTemplates.some(
        (template) => template.type === templateType,
      )
    ) {
      const template = this.getDefaultWorkflows().find(
        (workflow) => workflow.type === templateType,
      );

      return {
        ...template!,
        status: dto.status ?? template!.status,
      };
    }

    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, organizationId },
      select: { id: true },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    const updated = await this.prisma.workflow.update({
      where: { id: workflow.id },
      data: { status: dto.status },
      include: {
        member: true,
        steps: { orderBy: { dayOffset: 'asc' } },
      },
    });

    return this.presentWorkflow(updated);
  }

  private presentWorkflow(workflow: WorkflowWithSteps) {
    return {
      id: workflow.id,
      name: this.workflowName(workflow.type),
      type: workflow.type,
      status: workflow.status,
      description: this.workflowDescription(workflow.type),
      steps: workflow.steps.map((step) => ({
        id: step.id,
        dayOffset: step.dayOffset,
        messageTemplate: step.messageTemplate,
        createsTask: this.stepCreatesTask(workflow.type, step.dayOffset),
      })),
    };
  }

  private workflowName(type: WorkflowType) {
    return (
      defaultWorkflowTemplates.find((template) => template.type === type)
        ?.name ?? type.replaceAll('_', ' ').toLowerCase()
    );
  }

  private workflowDescription(type: WorkflowType) {
    if (type === WorkflowType.RENEWAL_REMINDER) {
      return 'Reminds members before their membership expires.';
    }

    if (type === WorkflowType.OVERDUE_RECOVERY) {
      return 'Follows up after a membership becomes overdue.';
    }

    return 'Win-back message sequence for churned members.';
  }

  private stepCreatesTask(type: WorkflowType, dayOffset: number) {
    return (
      defaultWorkflowTemplates
        .find((template) => template.type === type)
        ?.steps.some(
          (step) => step.dayOffset === dayOffset && step.createsTask,
        ) ?? false
    );
  }
}
