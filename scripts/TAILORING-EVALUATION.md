# Tailoring evaluation — 12 November 2026

Run deterministic checks with `node scripts/evaluate-tailoring.cjs`.
Run three fictional examples against OpenRouter with `node --env-file=.env.local scripts/evaluate-tailoring.cjs --live`.
Live evaluation uses the configured account. It does not read real user resumes.

## Changes and observations

- Added editorial examples distinguishing useful synthesis from synonym replacement and unsupported claims.
- Malformed requirement/suggestion arrays now trigger the existing retry instead of silently becoming empty lists.
- Prioritized dots for tailoring, retaining the existing free model fallbacks. An explicit OPENROUTER_MODELS setting still takes precedence.
- Added a separate evidence review to initial and regenerated suggestions. Failed review calls fail the operation rather than expose unreviewed edits. Token usage includes both calls.
- Suppressed skills changes when no required qualification is directly covered, avoiding arbitrary reordering for unrelated jobs.

The initial live run with Nemotron often only removed first-person language from the summary. It also conflated usability sessions with interviews in the career-switch example. Additional instructions improved coverage judgments but did not consistently eliminate unsupported rewrites.

The final dots run returned a synthesized fintech summary using the existing 41% to 23% onboarding result and three-team design system. It retained two text suggestions for the strong-match case (9 seconds), one of three proposals after evidence review for career switching (10 seconds), and no text suggestions for the unrelated backend role (5 seconds). These timings are observations, not guarantees.

## Limits

This is a small qualitative evaluation, not proof of broad model superiority. Review still accepted a debatable rewrite of handling complaints as synthesis; requirement coverage also occasionally overstates adjacent experience. Human accept/keep-original review remains necessary. Model fallback can change writing quality. More professions and longer resumes should be included before claiming a measured quality score.

Deterministic checks verify malformed-output retry, invented-number rejection and unknown-target rejection. They do not measure semantic truthfulness.
