import * as Sentry from "@sentry/nextjs";

// Allowlist telemetry fields: resume text, exception messages, URLs, headers,
// user identity, breadcrumbs, and AI input/output never leave this boundary.
export function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    environment: event.environment,
    release: event.release,
    level: "error",
    exception: {
      values: event.exception?.values?.map((value) => ({
        type: "ApplicationError",
        value: "Application operation failed",
        stacktrace: {
          frames: value.stacktrace?.frames?.map((frame) => ({
            filename: frame.filename?.split("?")[0],
            function: frame.function,
            lineno: frame.lineno,
            colno: frame.colno,
            in_app: frame.in_app,
          })),
        },
      })),
    },
  };
}

export const reportingOptions = {
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  defaultIntegrations: false,
  tracesSampleRate: 0,
  beforeSend: scrubEvent,
  beforeBreadcrumb: () => null,
} satisfies Sentry.BrowserOptions;

export function reportError(error: unknown, operation: string) {
  const eventId = Sentry.captureException(error);
  console.error(JSON.stringify({ event: "application.error", operation, eventId }));
  return eventId;
}
