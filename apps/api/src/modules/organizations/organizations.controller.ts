import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { requireOrganizationId } from '../auth/require-organization-id';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { SetupOrganizationDto } from './dto/setup-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@UseGuards(JwtAuthGuard)
@Controller('organization')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly authService: AuthService,
  ) {}

  @Post('setup')
  async setup(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SetupOrganizationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.organizationsService.setup(req.user!.sub, dto);
    const session = await this.authService.createSessionForUser(req.user!.sub);
    this.setRefreshCookie(res, session.refreshToken);

    const { refreshToken, ...responseBody } = session;
    void refreshToken;

    return responseBody;
  }

  @Get('current')
  getCurrent(@Req() req: AuthenticatedRequest) {
    return this.organizationsService.getCurrent(this.organizationId(req));
  }

  @Patch('current')
  updateCurrent(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateCurrent(
      this.organizationId(req),
      dto,
    );
  }

  private organizationId(req: AuthenticatedRequest) {
    return requireOrganizationId(req);
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
