import { Module } from '@nestjs/common';
import { MessagingModule } from '../../lib/messaging/messaging.module';
import { DatabaseModule } from '../database/database.module';
import { WorkflowsJob } from './workflows.job';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [DatabaseModule, MessagingModule],
  providers: [WorkflowsService, WorkflowsJob],
  exports: [WorkflowsService, WorkflowsJob],
})
export class WorkflowsModule {}
