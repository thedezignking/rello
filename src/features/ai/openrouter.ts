import "server-only";
import type { z } from "zod";

// Free models first-to-last; OpenRouter falls through the list when one is
// rate-limited or down. Override with OPENROUTER_MODELS (comma-separated).
// Picked by probing on Oct 30, 2026: Nemotron and dots answered reliably with
// valid JSON once reasoning was off; the Gemma free tier was often rate-limited.
const DEFAULT_MODELS = [
  "nvidia/nemotron-3.5-super-vl:free",
  "dots-studio/dots-3-note-preview:free",
  "google/gemma-4-31b-it:free",
];

export function aiConfigured() {
  return !!process.env.OPENROUTER_API_KEY;
}

export class AIError extends Error {
  constructor(
    public code: "not_configured" | "rate_limited" | "bad_output" | "upstream",
    message: string,
  ) {
    super(message);
  }
}

type Usage = { model: string; inputTokens: number; outputTokens: number };

/**
 * Asks for a JSON object and validates it. Retries once when the model
 * returns something that doesn't match the schema.
 */
export async function chatJSON<T>({
  system,
  user,
  schema,
  maxTokens = 2500,
  temperature = 0.4,
}: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ data: T; usage: Usage }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new AIError("not_configured", "AI isn't set up.");
  const models = (process.env.OPENROUTER_MODELS ?? "").split(",").map((m) => m.trim()).filter(Boolean);

  let lastProblem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "X-Title": "Rello",
      },
      body: JSON.stringify({
        models: models.length ? models : DEFAULT_MODELS,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: attempt === 0 ? user : `${user}\n\nYour previous reply was not valid: ${lastProblem}\nReply with the JSON object only.`,
          },
        ],
        response_format: { type: "json_object" },
        // Reasoning models otherwise spend the whole token budget thinking and
        // return no answer at all.
        reasoning: { enabled: false },
        max_tokens: maxTokens,
        temperature,
      }),
      signal: AbortSignal.timeout(60_000),
    }).catch(() => null);

    if (!res) throw new AIError("upstream", "The AI service didn't respond.");
    if (res.status === 429) throw new AIError("rate_limited", "The AI is busy right now.");
    if (!res.ok) throw new AIError("upstream", `The AI service returned ${res.status}.`);

    const body = await res.json().catch(() => null);
    const text: string = body?.choices?.[0]?.message?.content ?? "";
    const usage: Usage = {
      model: body?.model ?? "unknown",
      inputTokens: body?.usage?.prompt_tokens ?? 0,
      outputTokens: body?.usage?.completion_tokens ?? 0,
    };

    const parsed = schema.safeParse(extractJSON(text));
    if (parsed.success) return { data: parsed.data, usage };
    lastProblem = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
  }
  throw new AIError("bad_output", "The AI's answer didn't make sense.");
}

/** Pulls the first JSON object out of a reply, tolerating ```json fences. */
function extractJSON(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
