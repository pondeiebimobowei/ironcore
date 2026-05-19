import { Transform } from 'class-transformer';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { emptyStringToUndefined } from '../../members/dto/empty-string-to-undefined';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @Transform(emptyStringToUndefined)
  name?: string;
}
