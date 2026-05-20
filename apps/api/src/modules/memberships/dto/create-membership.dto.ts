import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { emptyStringToUndefined } from '../../members/dto/empty-string-to-undefined';

export class CreateMembershipDto {
  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  planId?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  expiryDate!: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  amount?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  currency?: string;
}
