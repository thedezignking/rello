const isolatedKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_DB_URL",
  "OPENROUTER_API_KEY",
  "PAYSTACK_SECRET_KEY",
  "PAYSTACK_WEBHOOK_SECRET",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_AUTH_TOKEN",
  "PDF_RENDER_ORIGIN",
  "NEXT_PUBLIC_SITE_URL",
];
const origin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
};
export function developmentEnvironment(base, development, legacy) {
  if (development.APP_ENV && development.APP_ENV !== "development")
    throw Error("The development env file must use APP_ENV=development.");
  const target = origin(development.NEXT_PUBLIC_SUPABASE_URL);
  if (target && target === origin(legacy.NEXT_PUBLIC_SUPABASE_URL))
    throw Error(
      "Development must use a separate Supabase project from .env.local. Leave Supabase unset for browser-only development.",
    );
  return {
    ...base,
    ...Object.fromEntries(isolatedKeys.map((key) => [key, ""])),
    ...development,
    NODE_ENV: "development",
    APP_ENV: "development",
  };
}
