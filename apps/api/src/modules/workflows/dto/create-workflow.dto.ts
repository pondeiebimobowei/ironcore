import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { WorkflowDefinitionStatus } from '@prisma/client';

export class CreateWorkflowStepDto {
  @IsInt()
  dayOffset!: number;

  @IsString()
  @MinLength(2)
  label!: string;

  @IsString()
  @MinLength(2)
  messageTemplate!: string;

  @IsOptional()
  @IsBoolean()
  createsTask?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateWorkflowDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  description!: string;

  @IsString()
  @MinLength(2)
  category!: string;

  @IsEnum(WorkflowDefinitionStatus)
  status!: WorkflowDefinitionStatus;

  @IsString()
  @MinLength(2)
  trigger!: string;

  @IsString()
  @MinLength(2)
  goal!: string;

  @IsString()
  @MinLength(2)
  audience!: string;

  @IsString()
  @MinLength(2)
  timezone!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowStepDto)
  steps!: CreateWorkflowStepDto[];
}
