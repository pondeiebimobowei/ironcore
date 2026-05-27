import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { TimelineModule } from '../timeline/timeline.module';
import { MembershipStateService } from './membership-state.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [DatabaseModule, AuthModule, TimelineModule],
  controllers: [MembershipsController],
  providers: [MembershipStateService, MembershipsService],
  exports: [MembershipStateService, MembershipsService],
})
export class MembershipsModule {}
