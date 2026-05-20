import { Module } from '@nestjs/common';
import { MessagingModule } from '../../lib/messaging/messaging.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { WorkflowsJob } from './workflows.job';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [DatabaseModule, MessagingModule, AuthModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowsJob],
  exports: [WorkflowsService, WorkflowsJob],
})
export class WorkflowsModule {}
