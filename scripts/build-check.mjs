import { spawn } from "node:child_process";
// Keep verification builds separate from the user's running dev server.
const env = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_BUILD_DIR: ".next-build-check",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  SUPABASE_SECRET_KEY: "",
  OPENROUTER_API_KEY: "",
  PAYSTACK_SECRET_KEY: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
  SENTRY_AUTH_TOKEN: "",
};
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  env,
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 1));
