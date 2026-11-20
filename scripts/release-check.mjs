const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "OPENROUTER_API_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SENTRY_DSN",
];
const missing = required.filter(
  (key) => !process.env[key] || /your-project|replace_me/.test(process.env[key]),
);
if (process.env.APP_ENV !== "production") missing.push("APP_ENV=production");
if (!/^https:\/\//.test(process.env.NEXT_PUBLIC_SITE_URL ?? "")) missing.push("HTTPS NEXT_PUBLIC_SITE_URL");
if (process.env.AI_DEMO_MODE === "true") missing.push("AI_DEMO_MODE must be disabled");
if (missing.length) {
  console.error(`Release configuration needs: ${missing.join(", ")}`);
  process.exitCode = 1;
} else
  console.log(
    "Release configuration is present. Complete the staging and restore checks in docs/operations.md before release.",
  );
