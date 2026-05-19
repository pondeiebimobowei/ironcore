import { Injectable } from '@nestjs/common';
import {
  MessageDirection,
  MessageStatus,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../../modules/database/prisma.service';

type CreateOutboundMessageLogInput = {
  organizationId: string;
  memberId: string;
  workflowStepId?: string;
  phoneNumber: string;
  content: string;
  status: MessageStatus;
  errorMessage?: string;
  sentAt?: Date;
  timelineMetadata?: Record<string, unknown>;
};

@Injectable()
export class MessageLogService {
  constructor(private readonly prisma: PrismaService) {}

  async createOutboundMessageLog(input: CreateOutboundMessageLogInput) {
    const messageLog = await this.prisma.messageLog.create({
      data: {
        organizationId: input.organizationId,
        memberId: input.memberId,
        workflowStepId: input.workflowStepId,
        phoneNumber: input.phoneNumber,
        direction: MessageDirection.OUTBOUND,
        content: input.content,
        status: input.status,
        errorMessage: input.errorMessage,
        sentAt: input.sentAt,
      },
    });

    if (input.status === MessageStatus.SENT) {
      await this.prisma.timelineEvent.create({
        data: {
          organizationId: input.organizationId,
          memberId: input.memberId,
          type: TimelineEventType.MESSAGE_SENT,
          metadata: {
            messageLogId: messageLog.id,
            workflowStepId: input.workflowStepId,
            ...input.timelineMetadata,
          },
          createdAt: input.sentAt,
        },
      });
    }

    return messageLog;
  }
}
