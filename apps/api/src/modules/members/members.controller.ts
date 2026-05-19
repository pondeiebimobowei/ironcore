import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { CreateMemberDto } from './dto/create-member.dto';
import { ImportMembersDto } from './dto/import-members.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

@UseGuards(JwtAuthGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  list(
    @Req() req: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('status') status?: MemberStatus,
  ) {
    const safeStatus = Object.values(MemberStatus).includes(
      status as MemberStatus,
    )
      ? status
      : undefined;

    return this.membersService.list(this.organizationId(req), {
      search,
      status: safeStatus,
    });
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateMemberDto) {
    return this.membersService.create(this.organizationId(req), dto);
  }

  @Post('import')
  import(@Req() req: AuthenticatedRequest, @Body() dto: ImportMembersDto) {
    return this.membersService.import(this.organizationId(req), dto);
  }

  @Get(':id')
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.membersService.get(this.organizationId(req), id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(this.organizationId(req), id, dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.membersService.remove(this.organizationId(req), id);
  }

  private organizationId(req: AuthenticatedRequest) {
    return req.user!.organizationId;
  }
}
