import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../modules/database/database.module';
import { MockMessagingProvider } from './mock-provider';
import { MESSAGING_PROVIDER } from './provider';

@Module({
  imports: [DatabaseModule],
  providers: [
    MockMessagingProvider,
    {
      provide: MESSAGING_PROVIDER,
      useExisting: MockMessagingProvider,
    },
  ],
  exports: [MESSAGING_PROVIDER, MockMessagingProvider],
})
export class MessagingModule {}
