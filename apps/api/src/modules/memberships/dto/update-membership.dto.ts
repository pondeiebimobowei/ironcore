import { MembershipStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { emptyStringToUndefined } from '../../members/dto/empty-string-to-undefined';

export class UpdateMembershipDto {
  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  planId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  amount?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  currency?: string;
}
