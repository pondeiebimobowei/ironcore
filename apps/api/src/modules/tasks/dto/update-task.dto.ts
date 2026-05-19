import { TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { emptyStringToUndefined } from '../../members/dto/empty-string-to-undefined';

export class UpdateTaskDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  @Transform(emptyStringToUndefined)
  dueDate?: string;
}
