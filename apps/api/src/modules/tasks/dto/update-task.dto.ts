import { TaskPriority, TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { emptyStringToUndefined } from '../../members/dto/empty-string-to-undefined';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  @Transform(({ value }: { value: unknown }) => trimString(value))
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  @Transform(emptyStringToUndefined)
  descriptionHtml?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  @Transform(emptyStringToUndefined)
  dueDate?: string;
}
