import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../modules/database/database.module';
import { MessageLogService } from './message-log.service';
import { MockMessagingProvider } from './mock-provider';
import { MESSAGING_PROVIDER } from './provider';

@Module({
  imports: [DatabaseModule],
  providers: [
    MessageLogService,
    MockMessagingProvider,
    {
      provide: MESSAGING_PROVIDER,
      useExisting: MockMessagingProvider,
    },
  ],
  exports: [MESSAGING_PROVIDER, MockMessagingProvider, MessageLogService],
})
export class MessagingModule {}
