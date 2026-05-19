type GlitchTipContext = {
  level?: "error" | "warning" | "info";
  mechanism?: string;
  tags?: Record<string, string | number | boolean | undefined>;
  extra?: Record<string, unknown>;
};

type ParsedDsn = {
  dsn: string;
  endpoint: string;
};

let parsedDsn: ParsedDsn | undefined;
let environment = "development";

export function initGlitchTip(params: { dsn?: string; environment?: string }) {
  parsedDsn = params.dsn ? parseDsn(params.dsn) : undefined;
  environment = params.environment ?? environment;

  if (!parsedDsn) {
    return;
  }

  window.addEventListener("error", (event) => {
    captureGlitchTipException(event.error ?? event.message, {
      mechanism: "window_error",
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    captureGlitchTipException(event.reason, {
      mechanism: "unhandledrejection",
    });
  });
}

export function captureGlitchTipException(
  error: unknown,
  context: GlitchTipContext = {},
) {
  if (!parsedDsn) {
    return;
  }

  const exception = exceptionFrom(error);
  const event = {
    event_id: eventId(),
    timestamp: Date.now() / 1000,
    platform: "javascript",
    environment,
    level: context.level ?? "error",
    logger: "ironcore-retain-web",
    request: {
      url: window.location.href,
    },
    exception: {
      values: [
        {
          type: exception.name,
          value: exception.message,
          stacktrace: exception.stack
            ? { frames: stackFrames(exception.stack) }
            : undefined,
          mechanism: {
            type: context.mechanism ?? "generic",
            handled: true,
          },
        },
      ],
    },
    tags: context.tags,
    extra: context.extra,
  };

  void sendEnvelope(event);
}

async function sendEnvelope(event: Record<string, unknown>) {
  if (!parsedDsn) {
    return;
  }

  const envelope = [
    JSON.stringify({
      event_id: event.event_id,
      dsn: parsedDsn.dsn,
      sent_at: new Date().toISOString(),
    }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  await fetch(parsedDsn.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope" },
    body: envelope,
    keepalive: true,
  }).catch(() => undefined);
}

function parseDsn(dsn: string): ParsedDsn | undefined {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+|\/+$/g, "");

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

function exceptionFrom(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || "Unknown error",
      stack: error.stack,
    };
  }

  return {
    name: "Error",
    message:
      typeof error === "string" ? error : JSON.stringify(error ?? "Unknown"),
    stack: undefined,
  };
}

function stackFrames(stack: string) {
  return stack
    .split("\n")
    .slice(1, 30)
    .map((line) => ({ function: line.trim() }))
    .reverse();
}

function eventId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID().replaceAll("-", "");
  }

  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
}
