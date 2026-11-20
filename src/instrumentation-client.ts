import { reportError, reportingOptions } from "@/lib/error-reporting";
import * as Sentry from "@sentry/nextjs";
Sentry.init(reportingOptions);
window.addEventListener("error", (event) => reportError(event.error, "browser"));
window.addEventListener("unhandledrejection", (event) => reportError(event.reason, "promise"));
