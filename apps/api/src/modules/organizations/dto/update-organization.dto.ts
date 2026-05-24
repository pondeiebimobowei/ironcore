import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';
import { emptyStringToUndefined } from '../../members/dto/empty-string-to-undefined';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @Transform(emptyStringToUndefined)
  name?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  tagline?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1800)
  establishedYear?: number;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  businessType?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  organizationSize?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @Transform(emptyStringToUndefined)
  websiteUrl?: string;

  @IsOptional()
  @IsEmail()
  @Transform(emptyStringToUndefined)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  primaryPhone?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  secondaryPhone?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  addressLine?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  city?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  state?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  country?: string;

  @IsOptional()
  @IsArray()
  businessHours?: unknown[];

  @IsOptional()
  @IsBoolean()
  closedOnPublicHolidays?: boolean;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @Transform(emptyStringToUndefined)
  logoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
