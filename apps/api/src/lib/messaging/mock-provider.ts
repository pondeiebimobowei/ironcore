import { Injectable } from '@nestjs/common';
import { MessageStatus } from '@prisma/client';
import { MessageLogService } from './message-log.service';
import type {
  MessagingProvider,
  SendMessageInput,
  SendMessageResult,
} from './provider';

type MessageMetadata = {
  organizationId?: unknown;
  memberId?: unknown;
  workflowStepId?: unknown;
  simulateFailure?: unknown;
};

@Injectable()
export class MockMessagingProvider implements MessagingProvider {
  constructor(private readonly messageLogService: MessageLogService) {}

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const metadata = input.metadata as MessageMetadata | undefined;
    const organizationId = this.stringValue(metadata?.organizationId);
    const memberId = this.stringValue(metadata?.memberId);
    const workflowStepId = this.stringValue(metadata?.workflowStepId);
    const shouldFail = metadata?.simulateFailure === true;
    const providerMessageId = `mock-${Date.now()}`;

    if (!organizationId || !memberId) {
      return {
        status: 'failed',
        error: 'organizationId and memberId metadata are required',
      };
    }

    if (shouldFail) {
      const messageLog = await this.messageLogService.createOutboundMessageLog({
        organizationId,
        memberId,
        workflowStepId,
        phoneNumber: input.to,
        content: input.message,
        status: MessageStatus.FAILED,
        errorMessage: 'Mock messaging failure',
      });

      return {
        providerMessageId,
        messageLogId: messageLog.id,
        status: 'failed',
        error: 'Mock messaging failure',
      };
    }

    const sentAt = new Date();
    const messageLog = await this.messageLogService.createOutboundMessageLog({
      organizationId,
      memberId,
      workflowStepId,
      phoneNumber: input.to,
      content: input.message,
      status: MessageStatus.SENT,
      sentAt,
      timelineMetadata: {
        provider: 'mock',
        providerMessageId,
      },
    });

    return { providerMessageId, messageLogId: messageLog.id, status: 'sent' };
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }
}
