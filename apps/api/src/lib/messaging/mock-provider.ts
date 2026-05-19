import { Injectable } from '@nestjs/common';
import {
  MessageDirection,
  MessageStatus,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../../modules/database/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

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
      await this.prisma.messageLog.create({
        data: {
          organizationId,
          memberId,
          workflowStepId,
          phoneNumber: input.to,
          direction: MessageDirection.OUTBOUND,
          content: input.message,
          status: MessageStatus.FAILED,
          errorMessage: 'Mock messaging failure',
        },
      });

      return { status: 'failed', error: 'Mock messaging failure' };
    }

    const sentAt = new Date();
    const messageLog = await this.prisma.messageLog.create({
      data: {
        organizationId,
        memberId,
        workflowStepId,
        phoneNumber: input.to,
        direction: MessageDirection.OUTBOUND,
        content: input.message,
        status: MessageStatus.SENT,
        sentAt,
      },
    });

    await this.prisma.timelineEvent.create({
      data: {
        organizationId,
        memberId,
        type: TimelineEventType.MESSAGE_SENT,
        metadata: {
          messageLogId: messageLog.id,
          workflowStepId,
          provider: 'mock',
          providerMessageId,
        },
        createdAt: sentAt,
      },
    });

    return { providerMessageId, status: 'sent' };
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }
}
