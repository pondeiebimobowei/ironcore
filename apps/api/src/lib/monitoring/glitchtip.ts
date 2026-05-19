import { randomUUID } from 'crypto';

type GlitchTipContext = {
  level?: 'error' | 'warning' | 'info';
  mechanism?: string;
  tags?: Record<string, string | number | boolean | undefined>;
  extra?: Record<string, unknown>;
};

type ParsedDsn = {
  dsn: string;
  endpoint: string;
};

export class GlitchTipReporter {
  private readonly parsedDsn?: ParsedDsn;
  private readonly environment: string;

  constructor(params: { dsn?: string; environment?: string }) {
    this.parsedDsn = params.dsn ? this.parseDsn(params.dsn) : undefined;
    this.environment = params.environment ?? 'development';
  }

  captureException(error: unknown, context: GlitchTipContext = {}) {
    if (!this.parsedDsn) {
      return;
    }

    const exception = this.exceptionFrom(error);
    const event = {
      event_id: this.eventId(),
      timestamp: Date.now() / 1000,
      platform: 'node',
      environment: this.environment,
      level: context.level ?? 'error',
      logger: 'ironcore-retain-api',
      exception: {
        values: [
          {
            type: exception.name,
            value: exception.message,
            stacktrace: exception.stack
              ? { frames: this.stackFrames(exception.stack) }
              : undefined,
            mechanism: {
              type: context.mechanism ?? 'generic',
              handled: true,
            },
          },
        ],
      },
      tags: context.tags,
      extra: context.extra,
    };

    void this.sendEnvelope(event);
  }

  private async sendEnvelope(event: Record<string, unknown>) {
    if (!this.parsedDsn) {
      return;
    }

    const envelope = [
      JSON.stringify({
        event_id: event.event_id,
        dsn: this.parsedDsn.dsn,
        sent_at: new Date().toISOString(),
      }),
      JSON.stringify({ type: 'event' }),
      JSON.stringify(event),
    ].join('\n');

    await fetch(this.parsedDsn.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: envelope,
    }).catch(() => undefined);
  }

  private parseDsn(dsn: string): ParsedDsn | undefined {
    try {
      const url = new URL(dsn);
      const projectId = url.pathname.replace(/^\/+|\/+$/g, '');

      if (!projectId) {
        return undefined;
      }

      return {
        dsn,
        endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      };
    } catch {
      return undefined;
    }
  }

  private exceptionFrom(error: unknown) {
    if (error instanceof Error) {
      return {
        name: error.name || 'Error',
        message: error.message || 'Unknown error',
        stack: error.stack,
      };
    }

    return {
      name: 'Error',
      message:
        typeof error === 'string' ? error : JSON.stringify(error ?? 'Unknown'),
      stack: undefined,
    };
  }

  private stackFrames(stack: string) {
    return stack
      .split('\n')
      .slice(1, 30)
      .map((line) => ({ function: line.trim() }))
      .reverse();
  }

  private eventId() {
    return randomUUID().replaceAll('-', '');
  }
}

export const glitchTipReporter = new GlitchTipReporter({
  dsn: process.env.GLITCHTIP_DSN,
  environment: process.env.NODE_ENV,
});

export function registerGlitchTipProcessHandlers() {
  process.on('uncaughtException', (error) => {
    glitchTipReporter.captureException(error, {
      mechanism: 'uncaughtException',
      tags: { fatal: true },
    });
  });

  process.on('unhandledRejection', (reason) => {
    glitchTipReporter.captureException(reason, {
      mechanism: 'unhandledRejection',
      tags: { fatal: false },
    });
  });
}
