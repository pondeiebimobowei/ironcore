type AnalyticsProperties = Record<string, string | number | boolean | undefined>;

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST ?? "https://app.posthog.com";

export function captureEvent(
  event: string,
  distinctId: string | undefined,
  properties: AnalyticsProperties = {},
) {
  if (!posthogKey || !distinctId) {
    return;
  }

  void fetch(`${posthogHost.replace(/\/$/, "")}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: posthogKey,
      event,
      distinct_id: distinctId,
      properties: {
        app: "ironcore-retain",
        ...properties,
      },
    }),
    keepalive: true,
  }).catch(() => undefined);
}
