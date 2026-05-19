import { Module } from '@nestjs/common';
import { MembershipStateService } from './membership-state.service';

@Module({
  providers: [MembershipStateService],
  exports: [MembershipStateService],
})
export class MembershipsModule {}
