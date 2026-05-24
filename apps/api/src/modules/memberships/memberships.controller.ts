import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { requireOrganizationId } from '../auth/require-organization-id';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { RenewMembershipDto } from './dto/renew-membership.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';
import { MembershipsService } from './memberships.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post('members/:memberId/memberships')
  create(
    @Req() req: AuthenticatedRequest,
    @Param('memberId') memberId: string,
    @Body() dto: CreateMembershipDto,
  ) {
    return this.membershipsService.create(
      requireOrganizationId(req),
      memberId,
      dto,
    );
  }

  @Patch('memberships/:id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.membershipsService.update(requireOrganizationId(req), id, dto);
  }

  @Post('memberships/:id/renew')
  renew(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: RenewMembershipDto,
  ) {
    return this.membershipsService.renew(requireOrganizationId(req), id, dto);
  }
}
