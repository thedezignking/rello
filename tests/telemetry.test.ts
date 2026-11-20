import { it, expect } from "vitest";
import { scrubEvent } from "@/lib/error-reporting";
it("drops private payloads and messages from telemetry", () => {
  const event = scrubEvent({
    type: undefined,
    message: "private resume",
    request: { url: "https://app/r/private?token=secret", headers: { cookie: "secret" } },
    user: { email: "fictional@example.invalid" },
    extra: { content: "private resume" },
    breadcrumbs: [{ message: "private resume" }],
    exception: {
      values: [
        {
          value: "private resume",
          type: "Error",
          stacktrace: {
            frames: [
              { filename: "app.js?token=secret", lineno: 10, colno: 1, vars: { content: "private resume" } },
            ],
          },
        },
      ],
    },
  });
  const serialized = JSON.stringify(event);
  expect(serialized).not.toMatch(/private resume|secret|fictional@|cookie|vars/);
  expect(serialized).toContain("app.js");
});
