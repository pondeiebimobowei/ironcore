import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { TasksModule } from '../tasks/tasks.module';
import { TimelineModule } from '../timeline/timeline.module';
import { MemberStateJob } from './member-state.job';

@Module({
  imports: [DatabaseModule, MembershipsModule, TasksModule, TimelineModule],
  providers: [MemberStateJob],
  exports: [MemberStateJob],
})
export class JobsModule {}
