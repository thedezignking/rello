export type DiffPart = { text: string; added: boolean };

/**
 * Word-level diff of `next` against `prev`: which runs of `next` are new.
 * Lines are short, so a plain LCS table is fine.
 */
export function diffWords(prev: string, next: string): DiffPart[] {
  const a = prev.split(/(\s+)/);
  const b = next.split(/(\s+)/);
  const norm = (w: string) => w.toLowerCase().replace(/[.,;:!?]+$/, "");
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = norm(a[i]) === norm(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const parts: DiffPart[] = [];
  const push = (text: string, added: boolean) => {
    const last = parts.at(-1);
    // Whitespace joins whatever run it sits in.
    if (last && (last.added === added || /^\s+$/.test(text))) last.text += text;
    else parts.push({ text, added });
  };
  let i = 0;
  let j = 0;
  while (j < b.length) {
    if (i < a.length && norm(a[i]) === norm(b[j])) {
      push(b[j], false);
      i++;
      j++;
    } else if (i < a.length && dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      push(b[j], true);
      j++;
    }
  }
  return parts;
}
