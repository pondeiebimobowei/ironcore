import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { emptyStringToUndefined } from './empty-string-to-undefined';

export class ImportMemberRowDto {
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
  @IsDateString()
  @Transform(emptyStringToUndefined)
  expiryDate?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  notes?: string;
}

export class ImportMembersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportMemberRowDto)
  rows!: ImportMemberRowDto[];
}
