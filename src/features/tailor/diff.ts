export type DiffPart = { text: string; added: boolean };
export type InlinePart = { text: string; kind: "same" | "added" | "removed" };

/**
 * Word-level diff of `next` against `prev`, as one inline edit: kept runs,
 * removed runs (from `prev`) and added runs (from `next`), in reading order.
 * Lines are short, so a plain LCS table is fine.
 */
export function diffInline(prev: string, next: string): InlinePart[] {
  const a = prev.split(/(\s+)/);
  const b = next.split(/(\s+)/);
  const norm = (w: string) => w;
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = norm(a[i]) === norm(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const parts: InlinePart[] = [];
  const push = (text: string, kind: InlinePart["kind"]) => {
    const last = parts.at(-1);
    // Whitespace joins whatever run it sits in.
    if (last && (last.kind === kind || /^\s+$/.test(text))) last.text += text;
    else parts.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && norm(a[i]) === norm(b[j])) {
      push(b[j], "same");
      i++;
      j++;
    } else if (j >= b.length || (i < a.length && dp[i + 1][j] >= dp[i][j + 1])) {
      push(a[i], "removed");
      i++;
    } else {
      push(b[j], "added");
      j++;
    }
  }
  return parts.filter((p) => p.text);
}

/** Just the new text, marking which runs are new. */
export function diffWords(prev: string, next: string): DiffPart[] {
  return diffInline(prev, next)
    .filter((p) => p.kind !== "removed")
    .map((p) => ({ text: p.text, added: p.kind === "added" }));
}
