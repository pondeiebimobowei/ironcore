import { Injectable } from '@nestjs/common';
import { MemberStatus, Prisma, TimelineEventType } from '@prisma/client';

type TimelineTransaction = Pick<Prisma.TransactionClient, 'timelineEvent'>;

type LogMemberStatusChangedParams = {
  tx: TimelineTransaction;
  organizationId: string;
  memberId: string;
  previousStatus: MemberStatus;
  nextStatus: MemberStatus;
  source: string;
  jobRunId?: string;
};

@Injectable()
export class TimelineService {
  async logMemberStatusChanged(params: LogMemberStatusChangedParams) {
    return params.tx.timelineEvent.create({
      data: {
        organizationId: params.organizationId,
        memberId: params.memberId,
        type: TimelineEventType.MEMBER_STATUS_CHANGED,
        metadata: {
          previousStatus: params.previousStatus,
          status: params.nextStatus,
          source: params.source,
          jobRunId: params.jobRunId,
        },
      },
    });
  }
}
