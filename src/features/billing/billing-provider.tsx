"use client";

import { useAuth } from "@/features/auth/auth-provider";
import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import type { BillingSummary } from "./catalog";

type BillingState = {
  summary: BillingSummary | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};
const BillingContext = createContext<BillingState | null>(null);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { user, hasAccount } = useAuth();
  const userId = hasAccount ? user!.id : null;
  const [state, setState] = useState<{
    userId: string;
    summary: BillingSummary | null;
    error: string | null;
  } | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const alive = useRef(true);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!userId) return;
    const current = ++sequence.current;
    setPendingUserId(userId);
    try {
      const response = await fetch("/api/billing", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Couldn’t load your credits.");
      if (alive.current && sequence.current === current) setState({ userId, summary: data, error: null });
    } catch (cause) {
      if (alive.current && sequence.current === current)
        setState((previous) => ({
          userId,
          summary: previous?.userId === userId ? previous.summary : null,
          error:
            cause instanceof TypeError
              ? "We couldn’t connect to load your credits. Please try again."
              : cause instanceof Error
                ? cause.message
                : "Couldn’t load your credits.",
        }));
    } finally {
      if (alive.current && sequence.current === current) setPendingUserId(null);
    }
  }, [userId]);
  useEffect(() => {
    const requests = sequence;
    alive.current = true;
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      alive.current = false;
      ++requests.current;
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  const current = state?.userId === userId ? state : null;
  return (
    <BillingContext
      value={{
        summary: current?.summary ?? null,
        loading: !!userId && !current,
        refreshing: !!userId && pendingUserId === userId,
        error: current?.error ?? null,
        refresh,
      }}
    >
      {children}
    </BillingContext>
  );
}

export function useBilling() {
  const state = use(BillingContext);
  if (!state) throw new Error("useBilling must be inside BillingProvider");
  return state;
}
