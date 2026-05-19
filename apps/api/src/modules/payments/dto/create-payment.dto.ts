import { PaymentMethod } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { emptyStringToUndefined } from '../../members/dto/empty-string-to-undefined';

export class CreatePaymentDto {
  @IsString()
  @MinLength(1)
  memberId!: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  membershipId?: string;

  @IsString()
  @MinLength(1)
  amountExpected!: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  amountPaid?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  proofUrl?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  reference?: string;

  @IsOptional()
  @IsString()
  @Transform(emptyStringToUndefined)
  notes?: string;
}
