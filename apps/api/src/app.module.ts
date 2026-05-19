import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { MembersModule } from './modules/members/members.module';
import { MembershipsModule } from './modules/memberships/memberships.module';

@Module({
  imports: [AuthModule, MembersModule, MembershipsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
