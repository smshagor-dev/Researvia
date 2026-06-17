# ResearVia Launch Readiness

## Public Repo Checklist

- README reflects the actual product name and setup flow.
- No placeholder org names remain in clone commands or image names intended for public docs.
- Dataset-size, delivery-rate, or adoption claims are removed unless verified from live production data.
- Example credentials are clearly marked as local-only seed data, not production defaults.

## Environment Checklist

- `DATABASE_URL` points to the production MySQL instance.
- `JWT_SECRET` and `JWT_REFRESH_SECRET` are distinct high-entropy secrets.
- `ENCRYPTION_KEY` is rotated away from the development placeholder.
- `APP_URL`, `BACKEND_URL`, and `FRONTEND_URL` reflect real public origins.
- `REDIS_URL` points to authenticated Redis.
- Storage, Sentry, OpenTelemetry, and AI provider keys are explicitly set or intentionally disabled.

## Billing Checklist

- Stripe products and price IDs match seeded plan slugs.
- Stripe webhook endpoint is live and signed with `STRIPE_WEBHOOK_SECRET`.
- NOWPayments API key and IPN secret are set.
- Coupon flows are tested for apply, redeem, and duplicate prevention.
- Failed payment notifications and subscription `past_due` transitions are verified.

## Worker / Cron Checklist

- Worker process is deployed separately from the API.
- Queue jobs are processing successfully.
- Monthly credit reset runs once per billing cycle.
- Discovery, sync, and backup cron expressions match your operational timezone.
- Worker heartbeat alerts are wired to your on-call path.

## Public Beta Exit Criteria

- Signup, login, logout, password reset, and 2FA all pass manual QA.
- Stripe and NOWPayments both complete end-to-end in staging.
- AI generation, professor reveal, scholarship unlock, and opportunity unlock deduct credits exactly once.
- Email send limits are enforced daily.
- Launch runbook, rollback plan, and support owner are documented.
