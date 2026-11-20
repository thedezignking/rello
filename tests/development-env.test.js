import { it, expect } from "vitest";
import { developmentEnvironment } from "../scripts/development-env.mjs";
it("keeps production credentials out of ordinary development", () => {
  const live = {
    NEXT_PUBLIC_SUPABASE_URL: "https://live.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "live",
    SUPABASE_SECRET_KEY: "live",
    PAYSTACK_SECRET_KEY: "live",
  };
  const local = developmentEnvironment(live, {}, live);
  expect(local.NEXT_PUBLIC_SUPABASE_URL).toBe("");
  expect(local.SUPABASE_SECRET_KEY).toBe("");
  expect(local.PAYSTACK_SECRET_KEY).toBe("");
  expect(() => developmentEnvironment({}, live, live)).toThrow("separate Supabase project");
  expect(
    developmentEnvironment({}, { ...live, NEXT_PUBLIC_SUPABASE_URL: "https://staging.supabase.co" }, live)
      .NEXT_PUBLIC_SUPABASE_URL,
  ).toContain("staging");
});
