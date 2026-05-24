import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  IsString,
  MinLength,
  Min,
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
  startDate?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  planName?: string;

  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  @Transform(emptyStringToUndefined)
  membershipAmount?: string;

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

export enum ImportDuplicateStrategy {
  CREATE_NEW = 'CREATE_NEW',
  UPDATE_EXISTING = 'UPDATE_EXISTING',
  SKIP_ROW = 'SKIP_ROW',
}

export class ImportResolutionDto {
  @IsInt()
  @Min(1)
  row!: number;

  @IsEnum(ImportDuplicateStrategy)
  strategy!: ImportDuplicateStrategy;
}

export class ConfirmImportDto extends ImportMembersDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportResolutionDto)
  resolutions?: ImportResolutionDto[];
}
