import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { TasksModule } from '../tasks/tasks.module';
import { TimelineModule } from '../timeline/timeline.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    MembershipsModule,
    TasksModule,
    TimelineModule,
  ],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
