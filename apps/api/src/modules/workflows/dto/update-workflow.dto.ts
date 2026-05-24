import { WorkflowDefinitionStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateWorkflowDto {
  @IsOptional()
  @IsEnum(WorkflowDefinitionStatus)
  status?: WorkflowDefinitionStatus;
}
