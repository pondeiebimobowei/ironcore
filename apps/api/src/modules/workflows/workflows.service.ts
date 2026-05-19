import { Injectable } from '@nestjs/common';
import { defaultWorkflowTemplates } from './default-workflow-templates';

@Injectable()
export class WorkflowsService {
  getDefaultWorkflows() {
    return defaultWorkflowTemplates;
  }
}
