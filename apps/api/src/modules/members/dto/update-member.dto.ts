import { MemberStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { emptyStringToUndefined } from './empty-string-to-undefined';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(7)
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  @Transform(emptyStringToUndefined)
  email?: string;

  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  notes?: string;
}
