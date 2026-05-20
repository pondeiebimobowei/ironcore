import { WorkflowStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateWorkflowDto {
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;
}
