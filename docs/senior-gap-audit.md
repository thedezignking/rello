# Senior gap audit: Rello

> **20 November implementation update:** the remaining code fixes and their verification are recorded in [the remediation ledger](audit-remediation.md). Findings and scores below remain the historical pre-fix snapshot. Deployment and provider activation checks are listed separately in the ledger and operations runbook.

19 November 2026 · Re-audit of `e6a00eb`, compared with the [16 November report](senior-gap-audit-2026-11-16.md) · Assessed for launch and ongoing use with real saved work; actual customer/payment volume was not established.

> This is a gap-finding self-check, not an assurance audit. Closing these gaps brings the app closer to what a senior engineer and designer would build; it does not certify security, production readiness or design quality.

## Implementation follow-up: first fix batch

The audit verdict, scores and closure table below are the **pre-fix snapshot**. The following changes were subsequently implemented on 19 November; this is not a new overall scoring exercise.

| Finding                            | Implementation status                                                                                                                                                                                                                 | Verification                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E01 — whole-document resets        | Fixed in source: write validation in both stores; lossless reads of old overlong text; explicit recovery for malformed/unknown data and newer formats; no blank fallbacks. Bad records remain listed without editable blank previews. | `npm run test:persistence` exercises both actual stores with isolated adapters, legacy reads, rejected writes, subsequent edits, stale revisions, malformed collections and newer schema versions. |
| D01 — failed reads look missing    | Key resume paths now distinguish retryable read failures, missing rows and malformed content; PDF/AI handlers return distinct 503/404/422 outcomes.                                                                                   | Server regression checks confirm failed reads never render a blank PDF and old long text can be exported intact. Browser verification remains outstanding.                                         |
| E23 — stale data on account change | Dashboard state is scoped to identity and ignores stale requests; editor and tailoring workspaces reset/refetch when identity changes.                                                                                                | Type/lint checks; account-switch browser journey still needs verification with disposable accounts. This does not implement E04 guest transfer.                                                    |
| E24 — lost import corrections      | Corrections checkpoint to session storage; storage failure shows a warning, offers a recovery download and adds an unload warning. Malformed import payloads offer recovery.                                                          | Type/lint checks; refresh/quota-error interaction still needs browser verification.                                                                                                                |
| E02/E08 — navigation and metadata  | Partly addressed: editor Back/Tailor links wait for content/title/template work, title writes are serialized and acknowledged after success, template changes appear after success, and export waits for metadata.                    | Type/lint checks. Browser Back, review navigation, conflict recovery and atomic review persistence remain open.                                                                                    |
| D07 — field feedback               | Partly addressed: text/area/bullet length errors are linked to inputs; skill input errors preserve pasted text. Auth/job-form feedback and skip-link work remain.                                                                     | Type/lint checks; assistive-technology verification outstanding.                                                                                                                                   |

AI rewrite filtering also rejects text above the shared storage limit, preventing an unpersistable suggestion from being offered. `node scripts/evaluate-tailoring.cjs` includes a regression for that boundary. All 31 mocked Paystack checks continue to succeed.

No hosted records were modified, no migration was applied and no deployment was made. Recovery preserves the data that is still stored; it cannot recreate content already overwritten before this fix. The dated audit probes intentionally reproduce the old defects and are historical evidence, not the post-fix regression suite. Use `npm run test:persistence` for current behavior.

## Scope and app map

Rello helps job seekers create or import a resume, tailor a separate copy to a job description, review proposed changes and export a PDF. Its main journeys are **create/import → edit → save**, **paste job → generate → review**, and **sign in → receive/buy credits → tailor**.

The stack is Next.js 16.4.6, React 19.3, TypeScript, Tailwind 4, Base UI/shadcn components and Motion. Supabase provides Google/email-code/anonymous authentication and Postgres storage with row policies. OpenRouter provides extraction and rewriting. Puppeteer/Chromium renders PDFs. Paystack provides hosted checkout and webhooks. Vercel deploys the GitHub repository. These are appropriate choices for this product's size.

The review covered 132 TS/TSX/CSS source files by inventory and all changes since `335c5a5`, with full reads of authentication/callback/account deletion, resume storage and autosave, billing handlers/provider/SQL, AI request and validation paths, imports and PDF export. The editor, review workspace, dashboard and shared fields were traced end to end. All three SQL migrations were read. Marketing components, template implementations and generated UI primitives were sampled. Entry points include ten API handlers, the auth callback, public document pages, dashboard, editor, tailoring workspace and print/metadata routes. There are no checked-in CI workflows. See the [fresh inventory](senior-gap-audit/2026-11-19/source-inventory.json).

**Fresh browser inspection did not complete.** An isolated source copy with placeholder credentials reached Next's Ready state, but headless navigation to its landing/dashboard/billing/document routes timed out. Computer-use tab creation also timed out for both local and deployed pages. No new screenshot or successful UI journey was obtained. The audit's own server/capture session was stopped; the user's existing dev server was left running. These environment/tool failures are not treated as proof the deployed app is down.

Historical public captures from 16 November at **1440×1000** and **390×844** were inspected again: landing and empty dashboard, with other archived public captures retained as reference. All screenshot links below are **historical**, not fresh measurements. The early desktop landing capture does not establish a permanently blank hero. Current authenticated layouts were reviewed in source.

To exercise behavior despite that limitation, the actual SupabaseResumeStore was run with an in-memory query adapter: invalid content, reload, subsequent overwrite and stale-revision rejection. The actual tailoring engine was also run against deliberately incorrect mocked model output. These are production-code boundary tests, not hosted/browser end-to-end verification.

Fresh evidence is saved in [`senior-gap-audit/2026-11-19/`](senior-gap-audit/2026-11-19/). This audit changed only reports and evidence helpers/artifacts; no implementation fixes or hosted writes were made. Source-backed findings below were rechecked; old HTTP/browser/Supabase evidence is labelled historical and does not establish current deployed state.

## Verdict

**Senior engineer:** There is a coherent feature structure and better-than-basic payment accounting: row locking, idempotency, owner checks and server-controlled fulfillment are real strengths. Email-code and billing-availability handling have improved, but preservation of users' work still blocks launch and reliable continued use. An overlong field still blanks a loaded resume; navigation, review decisions and import corrections lack a shared durable-save policy.

**Senior designer:** The product has a recognizable visual language, useful document previews and clear primary tasks. Its largest UX gaps are failure recovery and trust: errors can look like deleted resumes, guest sign-in overpromises retention, and actions appear complete before their changes are durable. Historical public mobile layouts fit the screen, but tiny demo labels and limited phone navigation remain in source. Recovery deserves priority over another visual redesign.

**Engineering: 5/10 · Design: 6/10**

Engineering is capped at 5 by E01, freshly reproduced through both storage implementations with in-memory data. Design is provisional and lower-confidence because no fresh browser journey completed. Scores remain unchanged overall: no earlier finding is fully closed; E19 and D01 are partly closed. These scores judge launch and ongoing use with important saved work; they are not an average of the tables.

| Engineering area               | Score | Reason                                                                                                                           |
| ------------------------------ | ----: | -------------------------------------------------------------------------------------------------------------------------------- |
| Security and access control    |     6 | Owner policies and server-controlled credit mutation are good; redirect validation, headers and migration TLS have gaps.         |
| Data model and integrity       |     3 | Credit transactions are strong; resume validation and subsequent saves can destroy content.                                      |
| Architecture and boundaries    |     7 | Clear feature modules, a store adapter and server-only service modules; persistence still has several inconsistent paths.        |
| Error handling and resilience  |     4 | Errors sometimes become empty/missing states; AI deadlines exceed handler budgets.                                               |
| Testing and verification       |     5 | Six offline scripts succeed, including new auth/config checks; critical save/account journeys and CI enforcement remain missing. |
| Code hygiene and consistency   |     6 | Strict TypeScript and lint are clean; obsolete demo exports and compressed billing JSX remain.                                   |
| Performance                    |     5 | Reused Chromium and scaled previews help; lists and expensive work lack sufficient bounds.                                       |
| Operations and delivery        |     3 | Vercel reports successful deployment; test-target isolation and app-level incident reporting remain unresolved.                  |
| Dependencies and configuration |     7 | Next is updated; npm now reports 10 moderate affected packages, with no high/critical entries.                                   |
| Docs and developer experience  |     4 | Billing notes help; the main README is the framework starter and important test/setup steps are fragmented.                      |
| Product and scope judgement    |     6 | The product focuses on useful tasks; core reliability should now take priority over additional features.                         |

| Design and UX area                       | Score | Reason                                                                                                                                                          |
| ---------------------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hierarchy and layout                     |     7 | Public pages have clear headings and a consistent frame; authenticated density was assessed only in source.                                                     |
| Typography                               |     6 | Core app sizes are restrained; mobile demo labels reach 8px.                                                                                                    |
| Colour, contrast and theming             |     7 | Intentional tokens and public light mode; two sampled landing contrast pairs are adequate, not a full contrast audit.                                           |
| Component consistency                    |     7 | Shared buttons, fields, dialogs, cards and one icon family give the interface continuity.                                                                       |
| Navigation and information architecture  |     6 | Main app destinations are clear; mobile landing header removes section navigation and sign-in.                                                                  |
| Core flows and feedback                  |     4 | Save durability, guest conversion and destructive editing need better recovery.                                                                                 |
| Forms and input                          |     4 | Labels and input types are mostly good; writable lengths disagree with stored schema limits.                                                                    |
| Loading, empty, error and success states |     5 | Billing preserves balance on refresh failure; resume failures still resemble missing data.                                                                      |
| Accessibility                            |     5 | Good primitives and several keyboard affordances; dead button semantics and unassociated field messages remain. Full assistive-technology testing was not done. |
| Responsive and mobile                    |     6 | Historical public captures fit 390px; current responsive code remains, but no fresh phone walkthrough completed.                                                |
| Copy and microcopy                       |     6 | Generally plain and specific; storage/retention and AI factuality promises exceed the actual guarantees.                                                        |

## Earlier findings: closure check

Still open means the mechanism remains in current source. Live-only evidence that could not be refreshed is explicitly limited.

| ID  | Status                  | Re-check result                                                                                     |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| E01 | Still open              | Both storage implementations reproduce whole-document blanking and later overwrite.                 |
| E02 | Still open              | Pending 800ms timer is cancelled; internal navigation does not flush.                               |
| E03 | Still open              | Choice/content writes remain separate 400ms/800ms timers.                                           |
| E04 | Still open              | Email helper improves delivery, but existing-email fallback has no guest transfer.                  |
| E05 | Still open              | Slash-backslash external redirect reproduced offline.                                               |
| E06 | Still open in source    | No header policy added; deployed headers not freshly obtained.                                      |
| E07 | Still open              | Migration certificate verification still disabled.                                                  |
| E08 | Still open              | Metadata acknowledgment/rollback behavior unchanged.                                                |
| E09 | Still open              | Per-call retry budgets still exceed total route deadlines.                                          |
| E10 | Still open              | Failed payment status still not saved to the order.                                                 |
| E11 | Still open              | Key absence still triggers import/improve samples outside an explicit demo mode.                    |
| E12 | Still open              | No CI directory/test gate; GitHub returns Vercel status and no PR workflow runs.                    |
| E13 | Still open              | Local API/DB target match; DB tests have no production-target refusal. Live equality is historical. |
| E14 | Still open              | Six unused demo exports and large/compressed modules remain.                                        |
| E15 | Still open              | List still selects complete content without pagination.                                             |
| E16 | Still open              | Parser/request/render concurrency bounds remain incomplete.                                         |
| E17 | Still open              | Import/improve count successes after work with no atomic reservation.                               |
| E18 | Still open              | Console-only app reporting; no checked-in incident/restore procedure.                               |
| E19 | Partly closed           | Next updated; 10 moderate affected packages now, versus 10 moderate + 2 low.                        |
| E20 | Still open              | Main README remains framework boilerplate.                                                          |
| E21 | Still open              | Fresh probe accepts Java from JavaScript and unrelated covered evidence.                            |
| E22 | Still open / unverified | Historical hydration error has no demonstrated fix; fresh browser run could not clear it.           |
| D01 | Partly closed           | Billing outage handling/retained balance improved; resume load failures unchanged.                  |
| D02 | Still open              | In-document deletion still lacks Undo/recoverable history.                                          |
| D03 | Still open              | Import still lacks cancellation; no total client deadline.                                          |
| D04 | Still open              | Tiny explanatory labels remain in current CSS.                                                      |
| D05 | Still open              | Phone header still hides sign-in and section navigation.                                            |
| D06 | Still open              | Sidebar diff still has a button role without an action.                                             |
| D07 | Still open              | Field errors/descriptions still not explicitly associated; no skip link.                            |
| D08 | Still open              | Absolute factuality claims remain stronger than enforcement.                                        |
| D09 | Still open              | Hosted guest rows still described as browser-only storage.                                          |
| D10 | Still open              | Skills remain bundled; mobile badge omits the pending skills plan.                                  |

Two new source-backed findings appear below: **E23 account-scoped stale dashboard state** and **E24 lost import corrections**.

## Fix first

1. **Engineering — E01: prevent whole-document resets from one invalid field. Critical · M.** A 2,001-character summary still saves successfully, reloads empty, and a later edit overwrites the original name. Validate writes and preserve raw invalid content. Evidence: `src/features/resumes/schema.ts:127`; `src/features/resumes/store.ts:218`; [fresh actual-store probe](senior-gap-audit/2026-11-19/system-probes.json).
2. **Engineering — E13: separate development and tests from production. High · M.** Local API/DB targets match; the previous audit identified that target as live. Add a disposable target and a production refusal before DB fixtures run. Current deployed-project equality was not freshly verified. Evidence: [sanitized inventory](senior-gap-audit/2026-11-19/source-inventory.json); `scripts/test-billing-concurrency.mjs:8`.
3. **Engineering — E02/E03/E08/E24: give editing, review and imports one durable save contract. High overall · L.** Flush/guard navigation, atomically save choices/content, acknowledge metadata after success and checkpoint import corrections. Evidence: `src/features/editor/use-autosave.ts:58`; `src/features/tailor/review.tsx:64`; `src/features/import/import-review.tsx:61`.
4. **Engineering — E04/E23: finish account-transition recovery. High overall · L.** Preserve guest work through verified transfer into an existing account, and clear/refetch account-scoped views when identity changes. Evidence: `src/features/auth/email-code.ts:18`; `src/features/auth/sign-in-dialog.tsx:213`; `src/features/home/home-view.tsx:68`.
5. **Engineering — E09: bound the entire AI task, not each individual request. High · M.** Up to four 60-second calls do not fit a 60/90-second handler. Share one total deadline, limit retries to that budget, and return a recoverable result/status when it expires. Evidence: `src/features/ai/openrouter.ts:53`, `:78`; `src/features/tailor/engine.ts:139`, `:142`; `src/app/api/tailor/route.ts:11`.
6. **Engineering — E12: make important checks a delivery gate. High · M.** Run type checking, lint and offline fixtures in CI, then add the save/account regressions above and isolated database tests. A successful Vercel build is not evidence that those behaviors were tested. Evidence: `package.json:5`; no `.github` directory; the current commit's only returned status was Vercel success.
7. **Design — D01/D03: design recovery from failed loads and long operations. High · M.** Keep “empty”, “missing”, “not authorised” and “couldn't load” distinct; offer an inline retry. Let users cancel imports instead of trapping them behind an indefinite modal. Evidence: `src/features/home/home-view.tsx:77`; `src/features/tailor/tailor-route.tsx:31`; `src/features/import/import-button.tsx:97`.

## Engineering findings

Each finding gives severity, whether it reads as an AI-generation tell, and effort: S is under an hour, M about a day, L longer. A tell describes the impression the code gives, not proof of authorship.

### New findings in this re-audit

**E23 — Medium · Tell: yes · M — Dashboard records do not follow account changes.**

`HomeView` loads through a stable callback once on mount, without depending on auth readiness or user ID. Closing the sign-in dialog or signing out updates auth in place, so a mounted dashboard can continue displaying the previous identity's resumes rather than fetching the new account. Ownership policies still govern later reads/writes; this is stale displayed private content and wrong-account UX, not a demonstrated server authorization bypass. This was traced in source, not reproduced through a fresh browser.

Evidence: `src/features/home/home-view.tsx:68`, `:73`, `:83`; `src/features/auth/auth-provider.tsx:60`, `:73`, `:111`. The billing provider already has user/sequence guards at `src/features/billing/billing-provider.tsx:14`, `:28`.

Fix: clear/refetch account-scoped state on identity changes, wait for auth readiness where needed, discard stale requests and key editor/review state to the owning identity. Test guest → new account, guest → existing account, sign-out and account switching.

**E24 — High · Tell: yes · M — Import corrections disappear on reload.**

Import review initializes React state from the original session-storage payload. Corrections update only component state; the corrected content is not checkpointed, and no dirty-state/unload guard protects it. Refresh restores the original extraction. A person correcting multiple imported sections can lose substantial work before Save resume. This was established by tracing the state/storage path, not a completed browser reproduction.

Evidence: `src/features/import/import-review.tsx:40`, `:61`, `:65`, `:76`, `:85`. Session storage is removed on save/discard but is never updated with corrections.

Fix: checkpoint corrected content in a recoverable local draft, restore it on refresh and warn before discarding unsaved corrections. Test refresh, accidental navigation, failed save and explicit discard.

### Data model and integrity

**E01 — Critical · Tell: yes · M — One invalid field silently blanks the entire resume.**

The stored schema caps most text at 2,000 characters, but shared inputs/areas do not enforce that limit and `saveContent` does not validate it. `parseContent` turns any validation failure into `emptyContent()`. A legitimate long summary therefore makes every section disappear on reload. Editing that blank fallback can overwrite previously valid fields.

Evidence: `src/features/resumes/schema.ts:10`, `:127`; `src/features/editor/fields.tsx:73`, `:116`; `src/features/resumes/store.ts:78`, `:218`, `:268`, `:344`. `node docs/senior-gap-audit/probes.cjs` returned `saveReportedSuccess: true`, `wholeDocumentEmpty: true`, `subsequentEditErasesOriginalName: true`. The reproduction used only an in-memory store and blocked Supabase calls. The live store has the same unvalidated-write/read-parser combination; no destructive hosted test was performed.

Fresh re-check: the [dated local probe](senior-gap-audit/2026-11-19/source-probes.json) reproduces those results. The additional [system probe](senior-gap-audit/2026-11-19/system-probes.json) exercises the actual SupabaseResumeStore with an in-memory query adapter and reports `overlongSummarySaved: true`, `reloadErasesName: true`, `subsequentEditOverwritesOriginalName: true`. It also confirms that stale revisions are rejected. This strengthens the evidence beyond the development-only store without modifying a hosted database.

Fix: validate create/update inputs before persistence; enforce compatible limits in the UI; distinguish missing legacy fields from invalid data; retain/export the raw document on parse failure instead of offering an editable blank replacement. Test summary, bullet and skill limits, legacy content and a subsequent edit after a parse error.

**E02 — High · Tell: yes · M — Internal navigation can discard pending edits.**

Autosave waits 800ms and cancels its timer on unmount. The editor's back and tailoring links navigate directly without calling `flush()`. A change followed quickly by “Tailor for a job” can generate from the older saved resume. `beforeunload` handles document exits, not ordinary Next client navigation. Conflict recovery offers Reload, which discards the local version without an export/merge option.

Evidence: `src/features/editor/use-autosave.ts:9`, `:58`, `:60`, `:68`; `src/features/editor/editor.tsx:120`, `:139`, `:311`. PDF export already demonstrates the safer pattern by awaiting `flush()` at `editor.tsx:165`.

Fix: use one navigation/save policy for back, tailoring, editing and route changes; keep recoverable local edits; offer reload versus export/merge for conflicts. Add a regression for typing and navigating within the debounce window.

**E03 — High · Tell: yes · M–L — Review decisions and resulting resume text are independent writes.**

Accepting a suggestion updates two states. Review status saves after 400ms; content saves through a separate 800ms loop. A failure, departure or second tab can leave “accepted” attached to unchanged text, or changed text attached to a pending suggestion. Session writes have no revision check, and the save indicator reports only content status.

Evidence: `src/features/tailor/review.tsx:50`, `:64`, `:81`; `src/features/resumes/store.ts:210`, `:218`. The initial credit-backed copy is transactional, but subsequent review edits are not.

Fix: atomically persist accepted/rejected decisions and content with a revision/session version, and make the indicator reflect both. Verify interrupted accept, undo, navigation and two-tab editing.

**E04 — High · Tell: yes · L — Guest work is left behind when signing into an existing account.**

On `email_exists`, the new email helper signs into the existing account. There is no capture or transfer of the old anonymous account's resumes, while row policies correctly restrict those rows to their original owner. The dialog still promises all guest work stays with the user. New tests verify fallback selection, not adoption of the guest's records.

Evidence: `src/features/auth/email-code.ts:18`, `:23`; `src/features/auth/sign-in-dialog.tsx:213`; `src/features/resumes/store.ts:93`; `supabase/migrations/20261030000000_init.sql:163`; `scripts/check-email-code.mjs:25`. A source search found no transfer implementation. This branch was traced, not exercised with real accounts.

Fix: design a verified account-link/merge operation that proves access to both identities, preserves copies on collisions and reports the outcome. Keep a recoverable guest export until completion. Do not solve this by weakening ownership policies.

**E08 — Medium · Tell: yes · S–M — Failed title/template changes are not recoverable consistently.**

`saveTitle` advances its “saved” ref before the write succeeds, then swallows failure after showing a toast. Blurring the same value again does not retry. Template selection changes locally without rollback, so preview and server-rendered PDF can disagree after a failed template write. Neither participates in the content save indicator.

Evidence: `src/features/editor/editor.tsx:88`, `:92`, `:95`, `:98`, `:165`; `src/app/api/pdf/route.ts:44` reads the saved template.

Fix: update confirmed metadata only after acknowledgment; track pending/error metadata alongside content; retry or roll back failed changes; include metadata in the export save barrier.

### Security and access control

**E05 — Medium · Tell: no · S — The callback's relative-path check permits an external redirect.**

A path beginning with slash-backslash passes the `startsWith('/')`/`!startsWith('//')` check. URL normalization interprets it as an external hostname. The in-memory probe resolved `/\\attacker.invalid` to `https://attacker.invalid`. This demonstrates redirect validation failure, not an account takeover or a completed OAuth exploit.

Evidence: `src/app/auth/callback/route.ts:13`, `:23`; [`source-probes.json`](senior-gap-audit/source-probes.json).

Fix: resolve the candidate URL against the canonical origin and reject a different origin, credentials or disallowed paths; test backslashes, encoded inputs and protocol-relative forms.

**E06 — Medium · Tell: no · M — Public responses lack several browser security policies.**

The historical live response had HSTS, but no CSP/frame-ancestor policy, X-Frame-Options, Referrer-Policy, Permissions-Policy or X-Content-Type-Options. Current `next.config.ts` still adds none; present deployed headers were not obtained in this re-audit. Missing a header is not itself proof of an exploit, but the repository does not define these browser policy boundaries.

Evidence: [`http-evidence.json`](senior-gap-audit/http-evidence.json); `next.config.ts:3` contains no header configuration.

Fix: define a deliberate frame policy, referrer/content-type policies and an application-compatible CSP. Start CSP in report-only mode while accounting for Next's inline scripts; do not paste a policy that breaks sign-in or rendering.

**E07 — Medium · Tell: no · S — The migration command disables database certificate verification.**

The documented migration runner sets `rejectUnauthorized: false`. This encrypts the connection but does not authenticate the server certificate. The billing test runner already shows the stronger approach with Supabase's CA and verification enabled.

Evidence: `scripts/migrate.mjs:23`; `scripts/test-billing-db.mjs:9`, `:16`.

Fix: use the trusted CA and hostname verification consistently. No migration command, including its `--dry` mode, was run during this audit.

### Error handling and resilience

**E09 — High · Tell: no · M — AI work can outlive the request that owns it.**

The provider wrapper permits two attempts of 60 seconds each. Tailoring and retry can each call the wrapper twice, sequentially. Their handlers allow 90 and 60 seconds respectively, before also allowing for auth, logging and database saves. A platform timeout may interrupt cleanup and leave the user waiting for a hold to expire. Client fetches generally have no total timeout; the import modal has no cancellation path.

Evidence: `src/features/ai/openrouter.ts:53`, `:78`; `src/features/tailor/engine.ts:139`, `:142`, `:181`, `:185`; `src/app/api/tailor/route.ts:11`; `src/app/api/tailor/line/route.ts:9`; `src/features/tailor/api.ts:18`; `src/features/import/import-button.tsx:39`.

Fix: propagate an overall deadline/abort signal through generation, review and persistence, budget retries within it, and provide a bounded client wait and recoverable status. The existing credit reservation/reclamation design should be preserved.

**E10 — Medium · Tell: yes · S — Declined/abandoned payments can remain “pending” forever in history.**

Verification returns a failed status for failed/abandoned provider payments but does not persist it to `credit_orders`. Checkout initialization failures also leave a pending row. The history therefore continues offering “Check payment” for attempts already known to have failed. No duplicate-credit defect was found here.

Evidence: `src/features/billing/server.ts:64`, `:73`; `src/app/api/billing/checkout/route.ts:22`; `src/features/billing/billing-view.tsx:63`; order status enum in `supabase/migrations/20261116021132_billing_credits.sql:33`.

Fix: model and persist initialization, pending and terminal outcomes idempotently; allow late verified success to recover correctly. Test refresh after abandonment and provider initialization timeout.

**E11 — Medium · Tell: yes · S — “Development” AI stand-ins remain reachable in production configuration failures.**

Import and general writing fall back to sample functions whenever the AI key is missing, without a production check. The import stand-in keeps only a handful of lines in a short summary instead of extracting the actual sections. The review does disclose that it is a rough sample, which reduces the risk, but configuration failure still becomes degraded success. Credit-backed tailoring already rejects missing configuration instead.

Evidence: `src/features/import/parse.ts:88`, `:118`; `src/features/ai/improve.ts:36`; `src/features/import/import-review.tsx:110`; `src/app/api/tailor/route.ts:41`.

Fix: gate stand-ins to explicit development/demo mode. In production, return a specific unavailable state while preserving the original input and explaining the retry path.

**E22 — Medium · Tell: no · M — A live hydration mismatch was observed; its cause is not established.**

The historical stabilized mobile landing capture, with reduced motion enabled, recorded React error 418. React describes this as server/client markup mismatch followed by client regeneration. The recent theme change has no demonstrated connection to this error. Fresh browsing did not complete, so this remains unresolved rather than a freshly reproduced failure or a confirmed fix. Historical timing/early-render results are not treated as a separate permanent-blank-hero defect.

Evidence: the mobile landing entry in [`browser-evidence.json`](senior-gap-audit/browser-evidence.json); [React's error explanation](https://react.dev/errors/418). Review candidates include render-shape branches in `src/features/home/landing-stories.tsx:32` and `src/features/home/paper-stage.tsx:66`; neither is established as the root cause.

Fix: reproduce in the installed development build with both motion preferences, capture the component stack, then keep initial server/client markup stable. Do not silence hydration warnings globally.

### Testing and verification

**E12 — High · Tell: yes · M — Important checks are manual and do not gate delivery.**

There is no checked-in workflow, no test script in `package.json`, and no reproducible browser journey suite. The current commit's returned GitHub status is Vercel success. The existing offline billing assertions and AI harness are useful, but they do not cover save/navigation loss, guest merge, disconnected review state or account transitions.

Evidence: `package.json:5`; `.github` directory absent in the fresh inventory; GitHub combined status for `e6a00eb` returned Vercel success and its PR-workflow list was empty; `scripts/test-billing-paystack.mjs:1`; `scripts/evaluate-tailoring.cjs:32`. Branch protection was not established.

Fix: wire types, lint and offline tests into CI. Add a small set of costly-behavior tests rather than broad snapshot coverage. Verify branch protection separately; it was not assumed from the repository contents.

**E13 — High · Tell: no · M — Development and database tests target the live data project.**

The previous audit found the local Supabase hostname in live assets. Fresh sanitized inspection confirms the local DB and public API still target the same project, but current equality with deployed configuration was not re-established. The concurrency test still commits a fixture user, resume and purchase before cleanup; both DB scripts accept any supplied target without a production refusal or test-project allowlist. A cleanup block does not isolate production or cover process termination.

Evidence: [`http-evidence.json`](senior-gap-audit/http-evidence.json) records both comparisons as true without recording credentials; `scripts/test-billing-concurrency.mjs:8`, `:19`; `scripts/test-billing-db.mjs:8`, `:41`; `BILLING.md:34` recommends the local env file.

Fix: create an isolated local/test project, use different keys and explicit environment validation, and refuse these tests against production. Run schema/RLS/concurrency tests against disposable data. Neither hosted DB test was run in this audit.

### Code hygiene and architecture

**E14 — Medium · Tell: yes · M — Old UI implementations and compressed code make ownership harder.**

`landing-motion.tsx` still exports six components with no references elsewhere in `src`: HeroDemo, TimelineLine, StepDot, BlockedDemo, CopyDemo and PopCheck. The current hero uses PaperStage and the small stories use separate components. The motion file is 549 lines, the review workspace 604, and the 66-line billing view contains a 1,382-character JSX line. There is no configured formatter command. These are maintainability issues, not reasons to rewrite the architecture.

Evidence: `src/features/home/landing-motion.tsx:152`, `:320`, `:334`, `:466`, `:498`, `:536`; whole-source reference search; `src/features/home/landing.tsx:13`; `src/features/billing/billing-view.tsx:53`; source-size measurements from this audit; `package.json:5`.

Fix: remove verified unused demos, split the review by responsibilities where useful, extract readable billing sections and apply one formatter. Preserve the current feature/store boundaries rather than introducing a new framework.

### Performance and resource control

**E15 — Medium · Tell: no · M — The dashboard fetches every complete resume and renders every preview.**

The list query selects all content with no pagination. Dashboard cards render full document components, and original/copy grouping repeatedly filters the loaded collection. This is manageable for a small account but scales with total saved documents and content, not the visible page.

Evidence: `src/features/resumes/store.ts:88`, `:102`; `src/features/home/home-view.tsx:99`, `:295`.

Fix: paginate metadata, load detailed content or preview data deliberately, and avoid rendering offscreen documents. Measure with realistic 50/200-document accounts before adding virtualization.

**E16 — Medium · Tell: no · M — File parsing and PDF rendering have incomplete resource bounds.**

Import checks compressed file size after parsing multipart data, then fully extracts PDF/DOCX text before truncating it to 20,000 characters. There are no explicit decompressed-size/page-count/time limits around extraction. PDF export opens a fresh Chromium page per request without an application concurrency/burst limit. No decompression attack or load test was attempted, so this is an observed control gap rather than a claimed exploit.

Evidence: `src/app/api/import/route.ts:19`, `:22`, `:30`, `:46`; `src/features/import/parse.ts:15`; `src/features/pdf/render.ts:53`; `src/app/api/pdf/route.ts:34`.

Fix: apply streaming/request limits, parser deadlines and page/uncompressed-size limits; cap concurrent render work and requests per account. Keep free PDF downloads, with a resource budget rather than a paywall.

**E17 — High · Tell: no · M — General AI limits count successful calls after the expensive work.**

Import/writing checks count successful usage rows before starting and record usage afterward. Parallel requests can all see the same remaining allowance, and failed attempts do not consume that allowance. Logging errors are not inspected. Initial tailoring has stronger reservation controls, but retry failures also need a separate resource-attempt budget from the user-facing successful-retry allowance. The usage wrapper additionally loses the usage of invalid-output attempts and attributes generation/review aggregates to one model.

Evidence: `src/features/ai/guard.ts:43`, `:48`, `:67`; `src/features/ai/openrouter.ts:87`, `:94`; `src/features/tailor/engine.ts:152`; `supabase/migrations/20261116021132_billing_credits.sql:217`, `:230`.

Fix: reserve an atomic resource allowance before expensive work, bound concurrent/failed attempts and record each provider attempt's model/tokens/outcome. Keep customer credit refunds separate from provider resource accounting. Actual model costs were not measured in this audit.

### Operations and delivery

**E18 — High · Tell: no · M — Incident reporting is deferred even though users depend on saved work.**

The application reports errors to console output, with no application error-tracking integration or checked-in incident/restore runbook found. The plan explicitly places Sentry later. Provider logs and Vercel deployment status exist, but neither establishes that the owner will hear about a broken save or missing credits before a customer reports it. Backup availability was not verified and is not claimed to be absent.

Evidence: `src/app/error.tsx:9`; `src/features/billing/server.ts:46`; `src/features/ai/guard.ts:85`; `PLAN.md:66`; dependency/config inventory; no runbook in checked-in docs.

Fix: add scrubbed error reporting and request correlation for saves, AI and payments, with basic failure alerts. Document a restore exercise and payment-reconciliation procedure. Avoid sending resume bodies or secrets to telemetry.

Refund note: `BILLING.md:27` acknowledges partial/provider-unreflected refunds require manual reconciliation, while `billing_fulfill_order` reverses complete pack credits (`supabase/migrations/20261116021132_billing_credits.sql:262`). A tested operator procedure and customer-facing policy are needed before accepting payments; a new admin dashboard is not required to solve this.

### Dependencies and configuration

**E19 — Medium · Tell: no · S–M — Dependency advisories need triage, mainly in tooling.**

The fresh npm audit reports **10 affected package entries: 10 moderate, 0 low, 0 high and 0 critical**, down from 12. Remaining paths trace to minimatch amplification through TypeScript ESLint and ts-morph/shadcn. This is a package count, not ten independent remotely exploitable application flaws. Next is now 16.4.6. The shadcn CLI remains a production dependency despite being tooling.

Evidence: `npm.cmd audit --json --fetch-retries=0 --fetch-timeout=20000` exit 1 after an initial restricted-network failure; [fresh check record](senior-gap-audit/2026-11-19/check-results.json); `package.json:30`; [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).

Fix: separate runtime/tooling exposure, update patched transitive paths and keep the lockfile current. Do not run `npm audit fix --force` blindly: npm suggested a major shadcn downgrade to 1.0.0 for part of the graph.

### Documentation and product judgement

**E20 — Medium · Tell: yes · S–M — The main setup documentation is still the starter README.**

The README describes create-next-app and Geist, while this app uses Onest/Newsreader plus document fonts. It omits Supabase setup, billing, the actual test commands and deployment/migration order. Billing documentation is useful, but `.env.example` omits the DB URL used by the migration/test scripts and model/allowance overrides read by the code.

Evidence: `README.md:1`, `:21`; `src/app/layout.tsx:3`; `.env.example:1`; `scripts/migrate.mjs:17`; `src/features/ai/openrouter.ts:50`; `src/features/ai/guard.ts:8`; `BILLING.md:9`.

Fix: make one short setup guide with prerequisites, environment separation, commands, migration order, test targets and billing activation. Link detailed billing/evaluation notes from it; do not replace it with a large architecture essay.

**E21 — Medium · Tell: yes · M — Factual review is stronger for rewritten lines than for other AI output.**

The evidence reviewer receives line proposals and approves target IDs; requirement coverage retains the model's classification as long as an evidence ID exists. Skill additions require a known evidence ID and a substring somewhere in the resume, but the reviewer does not validate those additions or the named evidence's meaning. When there are no rewritten lines, the engine returns before calling the reviewer at all. Existing fixtures exercise one line-validation scenario, not these paths.

Evidence: `src/features/tailor/engine.ts:141`, `:144`, `:260`, `:277`, `:299`; `scripts/evaluate-tailoring.cjs:33`, `:50`.

Fresh evidence: the [system probe](senior-gap-audit/2026-11-19/system-probes.json) supplies a fictional resume saying “uses JavaScript to build internal prototypes,” with deliberately wrong mocked output proposing Java and marking production Java backend development covered. Both survive application validation, with just one provider call because there are no text rewrites. This demonstrates a guardrail gap; it does **not** measure real-model hallucination frequency or claim that the live model generated this output.

Fix: add targeted fixtures for wrong requirement coverage, negated/substring skill evidence, unsupported causal claims and skills-only output. Validate the evidence relationship for each output type. Retain human approval and avoid presenting the second model as factual proof.

## Design and UX findings

### States, feedback and core flows

**D01 — High · Tell: yes · M — Failed loads look like empty or missing resumes.**

Partly closed: billing now returns auth-service outages as 503 and retains the prior balance during a refresh failure. Those changes do not alter the dashboard/editor/tailor branches below. Evidence: `src/features/billing/server.ts:39`; `src/features/billing/billing-provider.tsx:28`; `scripts/check-billing-auth.mjs` succeeds.

The dashboard catches a load failure, sets an empty array and shows the same empty guidance as a new account after the toast goes away. The editor and tailoring route turn failures into “couldn't find this resume”, with no inline retry. A network outage can therefore look like work was deleted or belongs to another account. The server context loader likewise maps a query failure to not-found by ignoring its error object.

Evidence: `src/features/home/home-view.tsx:77`, `:205`; `src/features/editor/editor.tsx:55`; `src/features/tailor/tailor-route.tsx:31`; `src/features/tailor/server.ts:24`. Compare the legitimate empty state in [the guest dashboard capture](senior-gap-audit/resumes-empty-desktop.png).

Fix: explicit loading/empty/missing/unauthorised/error states, an inline Retry and preservation of already displayed data during a refresh failure. Save/read status must describe what is known, not reassure beyond it.

**D02 — High · Tell: no · M — Removing an entry has no Undo or recovery path.**

Removing a role/project/education entry immediately filters it out, including all its nested text. Autosave then persists the removal. There is no Undo or review of the removed content. Conflict recovery's Reload similarly abandons current edits. Resume/account deletion has confirmation dialogs, showing the product already has a better pattern for larger destructive actions.

Evidence: `src/features/editor/fields.tsx:26`, `:164`; `src/features/editor/editor.tsx:311`; `src/features/home/home-view.tsx:445`; `src/features/settings/settings-view.tsx:217`.

Fix: offer undo for in-document deletion and a recoverable local edit/version history. Confirm only where undo is unavailable or the deletion scope is large; do not add confirmation dialogs to every small action.

**D03 — High · Tell: yes · M — Long operations can trap users without cancellation.**

The import modal is controlled open while reading, has no close button and no state-change/cancel handler. Its fetch has no client timeout. Tailoring replaces the job form with a busy panel, also without cancellation/status recovery. This is especially difficult when E09's server budget is exceeded.

Evidence: `src/features/import/import-button.tsx:39`, `:96`; `src/features/tailor/job-form.tsx:174`; `src/features/tailor/api.ts:18`.

Fix: visible bounded progress and a Cancel action, preserving the file/job text. On cancellation or timeout explain whether work is still running and how the held credit is recovered.

### Typography and mobile navigation

**D04 — Medium · Tell: no · S–M — Miniature demo labels are too small to do their explanatory job.**

The mobile match demo computes to 10px requirements and 8px header/status labels. Other decorative stories go as low as 7px. Those sizes do not automatically prove a WCAG failure, but require zooming to read the product explanation. The requested compact demo direction is reasonable; shrinking every detail is the weak tradeoff.

Evidence: `src/features/home/landing.css:123`, `:125`, `:127`, `:195`; computed values in [`browser-evidence.json`](senior-gap-audit/browser-evidence.json); [mobile match capture](senior-gap-audit/match-demo-mobile.png).

Fix: show fewer example rows, abbreviate secondary labels or simplify the graphic so the important explanatory text can remain readable. Preserve the illustration, fonts and compact composition.

Fresh source measurement: landing CSS contains **16 distinct fixed pixel font sizes** (7–42px) and **35 distinct literal hex colours**, including alpha/shadow values. See [inventory](senior-gap-audit/2026-11-19/source-inventory.json). These counts are scoped to marketing CSS; the separate point-based document-template scale is intentional and is not counted as an app-UI inconsistency. The specific legibility finding is the 8–10px explanatory copy, not the count alone.

**D05 — Medium · Tell: yes · S–M — Mobile removes navigation on a page about ten screens long.**

The public header hides all section links below `md` and sign-in below `sm`, without a compact menu. The captured 390px landing page is 8,532px tall, about ten 844px screens. Users looking for pricing, answers or sign-in must scroll or enter the app first. A comment describing this as a short scroll has become stale.

Evidence: `src/components/landing-header.tsx:44`, `:45`, `:63`; [mobile landing capture](senior-gap-audit/landing-mobile.png), PNG dimensions 390×8532.

Fix: retain a compact Pricing/Sign in route or add a small accessible section menu. Keep the main resume CTA prominent; a large navigation redesign is unnecessary.

### Accessibility and forms

**D06 — Medium · Tell: yes · S — Some suggested text announces a button but has no action.**

`SuggestedText` adds button semantics and a Tab stop by default. The document preview delegates activation, but the sidebar renders the same component without that handler or `interactive: false`. Keyboard/screen-reader users encounter a button-like diff that cannot be activated, before reaching the actual action buttons.

Evidence: `src/features/templates/suggested-text.tsx:25`; `src/features/tailor/review.tsx:414`; contrast with the document event delegation at `src/features/templates/page-preview.tsx:106`.

Fix: render sidebar diffs as readable text, or supply a real useful action and full keyboard behavior. Reserve button roles for actual controls and verify Tab/Enter/Space in both document and sidebar views.

**D07 — Medium · Tell: no · S–M — Field errors/descriptions are not consistently connected to their inputs.**

The shared fields use visible labels and `aria-invalid`, but errors/descriptions lack IDs referenced by `aria-describedby`. The job and sign-in forms have the same pattern and do not deliberately focus the first invalid field. The app also has no skip-to-content link. These are specific accessibility gaps; a full WCAG assessment was not performed.

Evidence: `src/features/editor/fields.tsx:73`, `:83`, `:116`; `src/components/ui/field.tsx:217`; `src/features/tailor/job-form.tsx:187`, `:200`; `src/features/auth/sign-in-dialog.tsx:188`, `:199`, `:248`; `src/app/layout.tsx:60`.

Fix: give descriptions/errors stable IDs, connect them to the input, focus invalid input after failed submission and add a keyboard-visible skip link. Preserve the existing labels, focus rings and Base UI primitives.

### Copy and user control

**D08 — Medium · Tell: yes · S — Absolute factuality claims exceed the validation contract.**

“Nothing made up” and “We never add what isn't on your resume” sound like guarantees. The implementation filters numeric tokens and uses a second model for some outputs; E21 shows outputs that are not semantically re-reviewed. The guide/terms correctly ask users to review AI results, so product copy currently gives conflicting levels of certainty.

Evidence: `src/features/home/landing.tsx:182`; `src/features/tailor/review.tsx:597`; `src/features/tailor/engine.ts:214`, `:260`, `:299`; `src/app/guide/page.tsx:39`.

Fix: describe the real protections plainly: suggestions are grounded in supplied experience, unsupported numeric additions are filtered, and users review every proposed change. Keep the human approval model visible.

**D09 — Medium · Tell: yes · S — Guest storage copy conflates browser access with storage location.**

“Saved in this browser only” implies local-only storage, while the configured guest store creates an anonymous Supabase account and uploads rows. What is browser-bound is the guest session/access, not the location of the resume data. Privacy documentation does mention Supabase, but the immediate UI is misleading.

Evidence: `src/features/editor/editor.tsx:353`; `src/features/home/home-view.tsx:192`; `src/features/resumes/store.ts:93`, `:118`; `src/app/privacy/page.tsx:40`.

Fix: say “Saved to this guest session. Sign in to access it across devices” and explain account loss/recovery accurately. Coordinate this with E04 instead of making a retention promise before transfer exists.

**D10 — Medium · Tell: no · M — Skills changes are a bundle while line changes are individually reviewable.**

Accepting a skills plan applies all proposed additions and the reorder together. The user cannot keep one new skill, reject another and accept only the order without later manual editing. The mobile suggestions badge counts only pending text lines even though total review progress also includes the skills plan.

Evidence: `src/features/tailor/review.tsx:75`, `:124`, `:204`, `:498`, `:528`; `src/components/view-tabs.tsx:30`.

Fix: make the reorder and individual additions selectable, keep their evidence visible and include unresolved skills decisions in the pending count. Preserve “accept all” as an optional shortcut.

## What reads as AI-generated

The re-audit adds another concrete inconsistency: import corrections are memory-only while ordinary editing autosaves (E24), and account-scoped dashboard data ignores auth changes while billing handles user/request identity explicitly (E23). These are risks from uneven workflow completion, not just visual taste.

The dominant tells are **unreconciled behavior and repository residue**, not the choice of font or illustrations:

- **Failure hidden by convenient defaults:** invalid resume → blank content (E01), failed load → empty/missing (D01), missing AI config → sample success (E11).
- **Several save contracts for one document:** content uses a revision/debounce loop, title/template use optimistic standalone writes, and review choices use a separate timer (E02/E03/E08).
- **An unfinished promise left in live copy:** the existing-email guest migration is deferred in a comment while the dialog promises retention (E04).
- **Old designs left alongside their replacements:** six unused exports in the 549-line motion file (E14).
- **Starter documentation and compressed additions:** README still advertises Geist/create-next-app, and billing JSX has lines exceeding 1,300 characters (E14/E20).
- **Overconfident wording around probabilistic behavior:** factual guarantees are stronger than the validator/reviewer actually establishes (D08).

The typography scan does **not** support a claim of random styling throughout the app. Outside templates, marketing and generated primitives, only two arbitrary Tailwind text-size class values were found (15px and 26px). Document point sizes and illustrative miniatures have separate roles; counting them all as one broken type scale would be misleading.

## Already at senior level

- **Email-code behavior and configuration have purposeful regression checks.** New helpers handle resend types, network/delivery errors, recipient cooldown and duplicate requests; sender configuration validates a verified domain and preserves redirect allowlists. Both offline check scripts succeed. This establishes local behavior, not actual email delivery or guest-account transfer. Evidence: `src/features/auth/email-code.ts:4`, `:29`; `src/features/auth/sign-in-dialog.tsx:56`; `scripts/check-email-code.mjs`; `scripts/check-auth-email-config.mjs`.
- **Billing refresh is identity-aware and preserves the last known balance.** It rejects stale responses and distinguishes auth service failures from sign-out. Evidence: `src/features/billing/billing-provider.tsx:14`, `:28`; `src/features/billing/server.ts:39`; `scripts/check-billing-auth.mjs` succeeds.
- **Theme transitions use the committed route, with an offline fixture.** Saved preferences, route changes, system changes and restored pages are covered by `scripts/check-public-theme.mjs`, which succeeds. Evidence: `src/features/theme/script.ts:16`; `src/features/theme/theme-sync.tsx:13`. This does not establish closure of the historical hydration finding.

- **Credit spending and initial copy creation share a transaction.** Row locks, request IDs, input hashes and unique ledger references protect the expensive boundary. Amounts use integer minor units. Evidence: `supabase/migrations/20261116021132_billing_credits.sql:21`, `:30`, `:149`, `:192`, `:256`.
- **Payment fulfillment is server-owned.** Verification checks reference, amount, currency, metadata and test/live mode, while webhook signatures use constant-time comparison. Client roles cannot execute accounting RPCs. Evidence: `src/features/billing/paystack.ts:61`, `:70`; migration `:91`, `:277`. The 31 offline boundary checks ran successfully during this audit.
- **Ownership is in row policies, not just hidden buttons.** Current source policies show owner checks for resumes/jobs/sessions and permanent-account-only reads for credit tables. The previous audit's catalogue inspection was historical; deployment parity was not rechecked. Anonymous-owner policies serve the guest feature and were not counted as a generic vulnerability. Evidence: initial migration `:163`; billing migration `:94`.
- **Ordinary content saves use optimistic concurrency.** A revision predicate prevents silently overwriting another tab's newer content. The missing piece is safe conflict/navigation recovery, not removing the revision check. Evidence: `src/features/resumes/store.ts:223`; initial migration `:92`.
- **Export waits for content flush, and originals are copied.** These are useful product invariants. Evidence: `src/features/editor/editor.tsx:165`; billing migration `:192`.
- **The visual language is deliberate.** Onest/Newsreader, semantic tokens, one icon family and shared controls give continuity. Historical sampled landing contrast ratios were about 4.94:1 for muted text on the public background and 7.53:1 for primary blue against white. This is a limited historical pair measurement, not fresh whole-app AA verification. Evidence: `src/app/layout.tsx:3`; `src/app/globals.css:20`; `src/features/home/landing.css:6`; `src/components/ui/button.tsx:6`.
- **Empty guidance, reusable document pages and keyboard alternatives exist.** The guest dashboard offers a useful starting action; public documents share navigation and readable layout. Skills/bullets include keyboard reordering. Evidence: [dashboard](senior-gap-audit/resumes-empty-desktop.png), [guide](senior-gap-audit/guide-mobile.png); `src/features/editor/skills-editor.tsx:56`; `src/features/editor/bullets-editor.tsx:87`.
- **Framework-specific choices were checked against installed docs.** For example, `error.tsx` uses `retry`, which is correct for the installed Next version; it was not incorrectly flagged for differing from older Next conventions. Evidence: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md:117`.

## Verification record

| Check                                      | Fresh result                                                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx.cmd tsc --noEmit --incremental false` | Exit 0; no diagnostics.                                                                                                                                         |
| `npm.cmd run lint`                         | Exit 0; no errors/warnings reported.                                                                                                                            |
| `node scripts/test-billing-paystack.mjs`   | Exit 0; 31 mocked boundary checks; no real payments.                                                                                                            |
| `node scripts/evaluate-tailoring.cjs`      | Exit 0; malformed output retry and fabricated-number/unknown-target rejection in one deterministic fixture case. No `--live` run.                               |
| `node scripts/check-billing-auth.mjs`      | Exit 0; auth outages, guest restrictions and verified-account fixture.                                                                                          |
| `node scripts/check-email-code.mjs`        | Exit 0; guest upgrades, existing-email fallback, resends and delivery errors.                                                                                   |
| `node scripts/check-auth-email-config.mjs` | Exit 0; mocked sender validation, code length, rate limits and preserved redirects.                                                                             |
| `node scripts/check-public-theme.mjs`      | Exit 0; offline startup/preferences/route/system assertions; no live URL argument.                                                                              |
| Dependency audit                           | Initial sandbox request reset; authorized retry exits 1 with 10 moderate affected packages, 0 low/high/critical.                                                |
| Two dated audit probes                     | Exit 0; reproduce E01/E05/E21 and confirm stale-revision rejection. All query/provider calls are in memory or intercepted.                                      |
| Browser attempts                           | Local headless route navigation timed out; computer-use local/deployed tab creation timed out. No fresh screenshot or completed UI interaction.                 |
| HTTP/config                                | Local API/DB target equality checked without printing credentials; live header/asset fetches did not complete. Historical evidence is not represented as fresh. |
| GitHub for `e6a00eb`                       | Combined status returns Vercel success; PR workflow run list empty. Branch rules not checked.                                                                   |
| Supabase deployment                        | Migrations/policies reviewed in source only; no fresh hosted catalogue or advisor check.                                                                        |
| Formatter                                  | No configured formatter/check command found; none installed for this audit.                                                                                     |

## Not checked

- **Hosted DB writes/tests, signup/email, actual checkout, refunds and deployments were intentionally not run.** The invoked [audit skill](C:/Users/HP/.agents/skills/senior-gap-audit/SKILL.md) explicitly says: “Don't run anything that writes to a hosted database, sends email, charges money or deploys”. The existing DB test scripts perform writes even where rolled back, so their earlier results were not counted as fresh audit verification.
- **Fresh browser journeys:** local isolated and deployed browser attempts timed out before a reliable UI state. No fresh desktop/phone screenshot or authenticated editor/review/payment-history walkthrough completed. Production store/engine behavior was exercised offline; that is not a replacement for a browser end-to-end test. Existing personal credentials were not used.
- **Backups, retention schedules, restore capability, branch rules and deployed secret configuration:** these were not established from repository evidence. Confirm in the hosting/provider dashboards and perform a restore exercise on disposable data.
- **Real model factual quality and costs:** offline fixtures used mocked outputs. The Java/JavaScript probe deliberately supplies bad output to test rejection; it does not claim the live model produced it. `VERIFICATION.md` remains historical evidence.
- **Full accessibility:** no screen-reader journey, axe suite, real touch-device run, zoom/reflow sweep or fresh contrast matrix was completed. Historical widths/contrast pairs and current source semantics have narrower coverage.
- **Load, file-bomb and penetration testing:** resource bounds were reviewed in code; abusive payloads were not sent to the live service.
- **Stable desktop hero rendering and hydration root cause:** no fresh browser result was obtained to close the historical issue. It is not a confirmed permanently blank document.
- **Complete secret-history scan:** `git ls-files '.env*'` lists only `.env.example`; no fresh all-ref credential-history scan was completed. This does not establish that no secret was ever exposed.
- **New production build:** the user's running dev server already occupied the normal build directory. An isolated audit runtime did not become inspectable in the browser; no fresh production build result is claimed. GitHub deployment status and local type/lint results are separate evidence.

The request to try the product was addressed through offline execution of actual persistence/AI code and attempted isolated browsing. It was not a completed live journey. Browser/HTTP timeouts are recorded as audit limitations, not application outage findings.

## Re-audit when

Recheck E01 first after the persistence fix, including recovery of already-invalid stored documents. Then verify interrupted saves, quick navigation, two tabs, failed metadata changes, accepted/undone suggestions, corrected-import refresh and guest-to-existing-account sign-in. Re-run database/RLS/concurrency tests only against an isolated project, add a Paystack test-mode checkout/webhook/reversal journey, and inspect editor/review at 1440px and 390px with keyboard and reduced motion. Mark each finding closed, partly closed or still open before adding new findings.

For **launch**, require reliable create/import/edit/review/export and truthful save/sign-in feedback. For **continued use**, additionally demonstrate restoration, incident visibility, environment safeguards and bounded resource behavior. The recommended next work is the Fix first list in order; additional landing-page polish alone will not raise the reliability assessment.
