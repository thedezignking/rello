import { AsyncLocalStorage } from "node:async_hooks";
import "server-only";

type Budget = {
  deadline: number;
  signal: AbortSignal;
  cleanup: boolean;
  finish: Array<(ok: boolean) => Promise<void>>;
  usage: Array<{ model: string; inputTokens: number; outputTokens: number }>;
};
const scope = new AsyncLocalStorage<Budget>();
export const currentBudget = () => scope.getStore();
export function onRequestFinished(cleanup: (ok: boolean) => Promise<void>) {
  scope.getStore()?.finish.push(cleanup);
}
export function outsideRequestBudget<T>(work: () => T) {
  return scope.exit(work);
}

export async function withRequestBudget(
  request: Request,
  milliseconds: number,
  handler: () => Promise<Response>,
) {
  const budget: Budget = {
    deadline: Date.now() + milliseconds,
    signal: AbortSignal.any([...(request.signal ? [request.signal] : []), AbortSignal.timeout(milliseconds)]),
    cleanup: false,
    finish: [],
    usage: [],
  };
  return scope.run(budget, async () => {
    let ok = false;
    try {
      const response = await handler();
      ok = response.ok;
      return response;
    } finally {
      budget.cleanup = true;
      await Promise.allSettled(budget.finish.map((cleanup) => cleanup(ok)));
    }
  });
}

export function databaseFetch(input: RequestInfo | URL, init?: RequestInit) {
  const budget = scope.getStore();
  const signals = [
    AbortSignal.timeout(8000),
    ...(init?.signal ? [init.signal] : []),
    ...(budget && !budget.cleanup ? [budget.signal] : []),
  ];
  return fetch(input, { ...init, signal: AbortSignal.any(signals) });
}
