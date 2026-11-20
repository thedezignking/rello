# Rello

Rello builds editable resumes and tailored copies with changes the applicant reviews. It uses Next.js 16, React 19, Supabase Auth/Postgres/RLS, OpenRouter, Paystack and a shared HTML/PDF renderer.

## Run locally

Use Node 24 and npm. Run `npm ci`, copy `.env.example` to `.env.development.local`, and run `npm run dev`. Development ignores hosted credentials from the generic `.env.local` and refuses to reuse its Supabase project. Keep deployment configuration in your hosting environment; use a separate Supabase project for connected development.

With Supabase variables omitted, development uses browser localStorage. This is a disposable development workspace; it has no account sync or real credits. AI fails closed unless a key is configured. Set `AI_DEMO_MODE=true` explicitly to use labelled development stand-ins. Production never uses those stand-ins.

For a connected environment, configure a dedicated Supabase project, enable anonymous sign-ins, enable Google and/or email OTP, and configure the redirect allowlist for your app's HTTPS origin and `/auth/callback`. Email OTP length is six digits. Use a verified SMTP sender before testing delivery beyond the provider's built-in limits. `npm run auth:emails` configures the existing email setup; inspect its required variables first.

Apply every migration in `supabase/migrations` in filename order. Set the migration target in the shell (not an implicitly loaded live URL), then run `npm run db:migrate -- --dry`. Remote targets require `APP_ENV`, `MIGRATION_DB_HOST`, verified TLS, and `--apply-staging` or `--apply-production`. See [operations](docs/operations.md).

## Checks

- `npm run check`: types, lint, formatting, component/unit tests, persistence/read-error fixtures, tailoring evaluation and mocked payment checks.
- `npm run test:db`: applies migrations to an isolated database, then tests permissions, billing, concurrency, atomic review saves and guest transfers. It accepts only `TEST_DATABASE_URL` on loopback with the database named `rello_test`. It never falls back to hosted credentials.
- `npx playwright install chromium`, then `npm run test:e2e`: starts a separate local server on port 3107 with a separate `.next-e2e` directory and no hosted credentials. Browser state is fictional and disposable.
- `npm run build`: production compilation. `npm run release:check` checks production configuration without printing secrets.
- `npm run format`: formats repository source. Historical audit evidence is excluded.

For database tests, run a disposable Postgres 17 container with database `rello_test`, bind its port to `127.0.0.1`, and set `TEST_DATABASE_URL` to that connection string. The test bootstrap emulates the small Auth schema/roles used by RLS; it does not replace a staging test against actual Supabase Auth.

GitHub Actions runs these checks, database tests, browser tests and a production build. Configure the Checks job as a required branch-protection check in the repository settings.

## Data and operational behavior

Editor text, title and template share one versioned save queue. Pending changes are checkpointed in this tab's sessionStorage, with an explicit recovery download when saving or conflict resolution needs attention. A review saves content and decisions in one database transaction using both revisions. Deletions inside an open document can be undone during that session.

Guests own real Supabase rows. Before account sign-in, Rello keeps a browser recovery copy and a short-lived HttpOnly proof of the guest session. A verified account may adopt that guest's work through a service-only transaction. Expired proof leaves the backup available for download. Test both same-user upgrades and signing into an existing account in staging.

Import accepts PDF/DOCX up to 5 MB, parses in a memory/time-limited worker, limits PDFs to 20 pages and checks DOCX expansion limits. AI operations share a request deadline, and uncredited operations reserve an atomic attempt slot before work. PDF export is bounded and requires a permanent account in connected environments.

Paystack orders are verified server-side before credit fulfillment. Webhooks and browser verification share idempotent reconciliation. Failed/abandoned verification is persisted; an already paid order is never downgraded by a late failure. Use Paystack test keys in staging.

Error reporting is opt-in through `NEXT_PUBLIC_SENTRY_DSN`. Reports allowlist stack locations and generic messages; resume content, account identity, request details and breadcrumbs are stripped. Tracing, session replay and AI payload logging are disabled. See the [incident and restore runbook](docs/operations.md) for activation and release checks.
