export type SendMessageInput = {
  to: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type SendMessageResult = {
  providerMessageId?: string;
  messageLogId?: string;
  status: 'sent' | 'failed';
  error?: string;
};

export interface MessagingProvider {
  sendMessage(input: SendMessageInput): Promise<SendMessageResult>;
}

export const MESSAGING_PROVIDER = Symbol('MESSAGING_PROVIDER');
