import { TaskType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { emptyStringToUndefined } from '../../members/dto/empty-string-to-undefined';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  memberId!: string;

  @IsEnum(TaskType)
  type!: TaskType;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  @Transform(emptyStringToUndefined)
  dueDate?: string;
}
