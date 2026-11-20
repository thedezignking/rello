# Credits and Paystack

Verified accounts receive 10 free credits once, including existing accounts. Guests receive the grant after verified sign-in. One credit pays for a saved tailored copy with useful suggestions, including 10 successful AI retries. Failures and results with no changes spend no credits. Editing and downloading are free. Credits do not expire.

Starter costs $2 for 5 credits. Job search costs $5 for 20 credits. Both are one-time packs.

## Setup

Apply the billing migration before deploying the API. Set these server environment variables:

- `SUPABASE_SECRET_KEY`: service-role secret, never public.
- `PAYSTACK_SECRET_KEY`: test key first, then the approved live key.
- `PAYSTACK_WEBHOOK_SECRET`: timestamped webhook signing secret, if enabled in Paystack. Legacy signatures are checked with the API secret.
- `NEXT_PUBLIC_SITE_URL`: canonical HTTPS production origin.
- `PAYSTACK_NGN_PER_USD`: explicit conversion rate to offer NGN as well as USD. Orders preserve their original quote. For example, 1500 means ₦3,000 for Starter and ₦7,500 for Job search; this is an example, not a current exchange rate.

Paystack webhook: `https://YOUR_DOMAIN/api/billing/webhook`.
Return URL: `/settings/billing?reference=…`.
Test both currencies in Paystack before using live keys. Missing keys produce an unavailable toast; welcome credits remain usable. NGN appears in the account billing page after its rate is set.

## Accounting

The server reserves one credit while generating, then atomically saves the job, resume and review and spends the credit. Errors release the hold. Holds expire after three minutes and are reclaimed on balance checks and new runs. Request IDs and input hashes recover completed results without duplicate charges. Each copy has 10 successful line retries; failures do not consume them.

Signed webhooks and return verification both verify amount, currency, reference, order metadata and test/live mode with Paystack before the same idempotent fulfillment. Browser clients can read their own credit records but cannot mutate them or invoke accounting RPCs.

Provider-reported transaction reversals remove the purchase credits once; already-spent credits can leave an adjustment. Refund/dispute events trigger verification. Partial refunds or refunds not reported as `reversed` by Paystack verification require operator reconciliation and are not automatically prorated. Account deletion removes account credit data and anonymizes retained purchase records. Paystack keeps its own payment records.

OpenRouter model configuration is unchanged. These packs do not select a premium model or provide measured per-model costs. Import and general writing help retain the daily fair-use limit.

## Checks

- `node scripts/test-billing-paystack.mjs`: mocked provider boundaries; no charges.
- `npm run test:db`: migrations, permissions, accounting, concurrency, review and guest-transfer checks against the loopback-only `rello_test` database in `TEST_DATABASE_URL`. Hosted URLs are refused. No `.env.local` fallback is read.
- See `docs/operations.md` for payment reconciliation, incident response and restore checks.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`.
