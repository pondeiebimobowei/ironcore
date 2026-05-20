import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RenewMembershipDto {
  @IsDateString()
  expiryDate!: string;

  @IsOptional()
  @IsString()
  amount?: string;
}
