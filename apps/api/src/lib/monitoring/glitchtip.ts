import * as Sentry from '@sentry/node';

type GlitchTipContext = {
  level?: 'error' | 'warning' | 'info';
  mechanism?: string;
  tags?: Record<string, string | number | boolean | undefined>;
  extra?: Record<string, unknown>;
};

export class GlitchTipReporter {
  captureException(error: unknown, context: GlitchTipContext = {}) {
    Sentry.withScope((scope) => {
      scope.setLevel(context.level ?? 'error');
      scope.setTag('logger', 'ironcore-api');

      if (context.mechanism) {
        scope.setTag('mechanism', context.mechanism);
      }

      for (const [key, value] of Object.entries(context.tags ?? {})) {
        if (value !== undefined) {
          scope.setTag(key, String(value));
        }
      }

      for (const [key, value] of Object.entries(context.extra ?? {})) {
        scope.setExtra(key, value);
      }

      Sentry.captureException(error);
    });
  }

  captureMessage(message: string, context: GlitchTipContext = {}) {
    Sentry.withScope((scope) => {
      scope.setLevel(context.level ?? 'info');
      scope.setTag('logger', 'ironcore-api');

      if (context.mechanism) {
        scope.setTag('mechanism', context.mechanism);
      }

      for (const [key, value] of Object.entries(context.tags ?? {})) {
        if (value !== undefined) {
          scope.setTag(key, String(value));
        }
      }

      for (const [key, value] of Object.entries(context.extra ?? {})) {
        scope.setExtra(key, value);
      }

      Sentry.captureMessage(message);
    });
  }
}

let isGlitchTipInitialized = false;

export function initGlitchTip(params: {
  dsn?: string;
  environment?: string;
  release?: string;
}) {
  if (isGlitchTipInitialized || !params.dsn) {
    return;
  }

  Sentry.init({
    dsn: params.dsn,
    environment: params.environment ?? 'development',
    release: params.release,
    tracesSampleRate: Number(
      process.env.GLITCHTIP_TRACES_SAMPLE_RATE ??
        process.env.SENTRY_TRACES_SAMPLE_RATE ??
        0.01,
    ),
  });

  isGlitchTipInitialized = true;
}

export const glitchTipReporter = new GlitchTipReporter();

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
