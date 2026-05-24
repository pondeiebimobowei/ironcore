import { IsString, MinLength } from 'class-validator';
import { UpdateOrganizationDto } from './update-organization.dto';

export class SetupOrganizationDto extends UpdateOrganizationDto {
  @IsString()
  @MinLength(2)
  declare name: string;
}
