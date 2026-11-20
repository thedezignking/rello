# Operations and release runbook

## Owners and staging

Assign a primary and backup operator before launch. Record contacts in the private deployment workspace. Use separate Supabase projects, Paystack test/live keys, Sentry environments and SMTP credentials for staging and production. Never point integration tests at either project; use the loopback-only `rello_test` database.

Before a release, run `npm run check`, `npm run test:db`, `npm run test:e2e`, `npm run build` and `npm run release:check` with deployment variables. In staging, manually verify email delivery, Google callbacks, guest-to-new-account upgrade, guest-to-existing-account transfer, paid PDF download, a real test-mode Paystack checkout, webhook replay and a canceled tailoring request. An offline fixture cannot establish provider configuration or deliverability.

## Schema changes

Back up the target and record its migration version before an apply. Set `SUPABASE_DB_URL`, `APP_ENV=staging|production`, and `MIGRATION_DB_HOST` explicitly in the shell. Remote connections verify the certificate; supply the project's CA through `SUPABASE_DB_CA_FILE` if it is not publicly trusted. Do not add `sslmode` or other SSL query parameters to the URL.

Run `npm run db:migrate -- --dry` first. Dry-run uses a read-only transaction and creates no tracking tables. Apply with `--apply-staging` or `--apply-production` only after reviewing the exact pending files. Each migration and its ledger entry commit together. The new review/guest/resource migration must be applied before deploying the matching app. If the app must roll back, retain this additive schema; do not drop user data to undo an app deployment.

## Alerts and diagnosis

Set `NEXT_PUBLIC_SENTRY_DSN` for the correct environment. Send a deliberate staging exception containing fictional private text, then inspect the received event: the message must be generic and there must be no request, user, breadcrumbs or extra payload. Set an error-rate alert and send a test notification to the operator. Verify hosting logs can be queried by `application.error` event IDs. Configure alerts for recurring billing/usage cleanup failures and elevated 5xx responses. No alert destination is created by this repository.

The SDK does not enable replay, tracing or AI input/output collection. Do not add raw errors, resume text, job descriptions, access tokens or provider payloads to logs. Source map uploads require separately provisioned Sentry project/token settings; keep those tokens server-only.

For elevated errors, compare deployment time, API status counts and provider health. Roll back the app deployment if a regression is confirmed. Do not retry mutations blindly: payment and tailoring requests have idempotency keys, and existing work may already have committed after a lost response. Verify the persisted result first.

## Payment incident

Disable checkout by removing the server Paystack key or disabling the provider integration in the deployment configuration, then redeploy. Existing credits remain in the ledger. Never edit a balance directly or fulfill an order from a client callback payload.

For a disputed/missing payment, locate the order reference in the provider dashboard and database. Check amount, currency, provider transaction ID, order state and credit-ledger entries. The signed webhook or authenticated `/api/billing/verify` route re-verifies with Paystack and performs idempotent fulfillment. Replayed verification must produce one purchase credit entry. A late provider success may legitimately recover a previously failed checkout. Confirm reversals against the provider; the reversal function adjusts credits/debt without deleting financial history.

## Lost work or save conflict

Keep the affected tab open. Download its recovery JSON before discarding a draft. A conflict blocks overwriting the newer stored version; compare the two copies and merge intentionally. For unreadable stored content, download the raw record and repair a copy. Never replace the record with an empty schema as a recovery action. Guest transfer failure keeps its browser recovery copy; expired transfer proof must not be treated as a successful adoption.

## Backup and restore drill

Before launch, inspect the actual Supabase plan and enable the required backup/PITR retention. Record retention, recovery-point objective and recovery-time objective privately. This code does not assert that hosted backups exist.

At least before launch and after a material schema change, restore a recent backup into a separate staging project. Disable outbound email, billing and AI before restoring. Reapply required roles/extensions/migration metadata as needed. Verify row counts, owner RLS isolation, one representative resume and review session, credit-ledger totals, order idempotency and no duplicate purchase fulfillment. Record start/end times and any data gap, then have the operator confirm the restored app works. Do not overwrite production as a drill.

For a real recovery, stop writes, preserve the failed system for investigation, choose the restore point, restore to a separate project, validate it, and switch deployment credentials only after sign-off by the incident owner. Reconcile post-backup successful provider payments through the same verification path, not manual grants.

## Key exposure

Revoke/rotate the affected key at its provider, update deployment secrets, redeploy and verify the old credential fails. Review provider access logs for misuse. For a Supabase service-secret exposure, audit ownership and financial ledger changes before restoring writes. Browser publishable keys are scoped by RLS; service, payment, AI, SMTP and management tokens must never use `NEXT_PUBLIC_` names.
