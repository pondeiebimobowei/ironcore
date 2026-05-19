import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { MemberStateJob } from './member-state.job';

@Module({
  imports: [DatabaseModule, MembershipsModule],
  providers: [MemberStateJob],
  exports: [MemberStateJob],
})
export class JobsModule {}
