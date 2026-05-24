import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { requireOrganizationId } from '../auth/require-organization-id';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowsService } from './workflows.service';

@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.workflowsService.list(requireOrganizationId(req));
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateWorkflowDto) {
    return this.workflowsService.create(
      requireOrganizationId(req),
      req.user!.sub,
      dto,
    );
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(
      requireOrganizationId(req),
      id,
      req.user!.sub,
      dto,
    );
  }
}
