import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { MemberStateJob } from '../jobs/member-state.job';
import { WorkflowsJob } from '../workflows/workflows.job';

type RunJobDto = {
  asOf?: string;
};

@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly memberStateJob: MemberStateJob,
    private readonly workflowsJob: WorkflowsJob,
  ) {}

  @Post('jobs/update-member-states')
  runMemberStateJob(@Body() dto: RunJobDto) {
    return this.memberStateJob.run(dto.asOf ? new Date(dto.asOf) : new Date());
  }

  @Post('workflows/run')
  runWorkflowJob(@Body() dto: RunJobDto) {
    return this.workflowsJob.runDueWorkflowSteps(
      dto.asOf ? new Date(dto.asOf) : new Date(),
    );
  }
}
