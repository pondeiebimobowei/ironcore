import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { MembershipStateService } from './membership-state.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MembershipsController],
  providers: [MembershipStateService, MembershipsService],
  exports: [MembershipStateService, MembershipsService],
})
export class MembershipsModule {}
