import { Module } from '@nestjs/common';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { JobsModule } from '../jobs/jobs.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [JobsModule, WorkflowsModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminRoleGuard],
})
export class AdminModule {}
