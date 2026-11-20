import * as Sentry from "@sentry/nextjs";
import { reportingOptions } from "./src/lib/error-reporting";
Sentry.init(reportingOptions);
