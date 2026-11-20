import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
// Never inherit hosted service credentials into browser tests. The local
// store and explicit AI stand-ins are the entire test environment.
const env = {
  ...process.env,
  NODE_ENV: "development",
  NEXT_BUILD_DIR: ".next-e2e",
  AI_DEMO_MODE: "true",
  PDF_TEST_MODE: "true",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  SUPABASE_SECRET_KEY: "",
  SUPABASE_DB_URL: "",
  OPENROUTER_API_KEY: "",
  PAYSTACK_SECRET_KEY: "",
  PAYSTACK_WEBHOOK_SECRET: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3107",
  PDF_RENDER_ORIGIN: "http://127.0.0.1:3107",
};
env.CHROME_PATH = chromium.executablePath();
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3107"],
  { env, stdio: "inherit" },
);
for (const event of ["SIGINT", "SIGTERM"]) process.on(event, () => child.kill(event));
child.on("exit", (code) => process.exit(code ?? 1));
