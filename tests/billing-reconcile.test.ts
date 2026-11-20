import { reconcilePayment } from "@/features/billing/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
const pay = vi.hoisted(() => ({
  verifyPayment: vi.fn(),
  validatePayment: vi.fn(() => "fixture-transaction"),
}));
vi.mock("@/features/billing/paystack", () => ({
  ...pay,
  paymentsEnabled: () => false,
  quotePacks: () => [],
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => null }));
describe("payment reconciliation", () => {
  for (const status of ["failed", "abandoned"]) {
    it(`persists ${status} without downgrading a paid order`, async () => {
      let orderStatus = "pending";
      const update = vi.fn();
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: { id: "fixture", status: orderStatus }, error: null }),
        update: (patch: unknown) => {
          update(patch);
          return query;
        },
        then: (resolve: (value: unknown) => void) => resolve({ error: null }),
      };
      const admin = { from: () => query } as unknown as SupabaseClient;
      pay.verifyPayment.mockResolvedValue({ status });
      expect(await reconcilePayment(admin, "fixture-reference")).toEqual({ status: "failed" });
      expect(update).toHaveBeenCalledWith({ status: "failed" });
      update.mockClear();
      orderStatus = "paid";
      expect(await reconcilePayment(admin, "fixture-reference")).toEqual({ status: "paid" });
      expect(update).not.toHaveBeenCalled();
    });
  }
});
