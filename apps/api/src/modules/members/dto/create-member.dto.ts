import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { emptyStringToUndefined } from './empty-string-to-undefined';

export class CreateMemberDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  lastName?: string;

  @IsString()
  @MinLength(7)
  phoneNumber!: string;

  @IsOptional()
  @IsEmail()
  @Transform(emptyStringToUndefined)
  email?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  planId?: string;

  @IsOptional()
  @IsDateString()
  @Transform(emptyStringToUndefined)
  expiryDate?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  notes?: string;
}
