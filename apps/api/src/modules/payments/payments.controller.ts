import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { requireOrganizationId } from '../auth/require-organization-id';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.paymentsService.list(this.organizationId(req));
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPendingPayment(
      this.organizationId(req),
      dto,
    );
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.paymentsService.get(this.organizationId(req), id);
  }

  @Post(':id/verify')
  verify(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.paymentsService.verifyPayment(
      this.organizationId(req),
      id,
      req.user!.sub,
    );
  }

  @Post(':id/reject')
  reject(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
  ) {
    return this.paymentsService.rejectPayment(
      this.organizationId(req),
      id,
      dto.reason,
    );
  }

  private organizationId(req: AuthenticatedRequest) {
    return requireOrganizationId(req);
  }
}
