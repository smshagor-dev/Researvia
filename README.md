# ResearVia

ResearVia is a full-stack SaaS platform for academic outreach, scholarship discovery, application tracking, and AI-assisted research communication.

The repository currently includes a Next.js frontend, a NestJS backend, Prisma/MySQL data models, Redis-backed queues, billing flows for Stripe and NOWPayments, and background workers for discovery, sync, and credit resets.

## What Is Production-Ready vs Experimental

- Production-oriented: authentication, user accounts, billing primitives, credits, Redis workers, storage integration, observability hooks, Docker images, and CI.
- Experimental or data-dependent: professor discovery volume, scholarship corpus size, opportunity volume, delivery-rate claims, and any seeded demo metrics.

No public marketing or setup document in this repo should claim a live dataset size unless you verify it from the deployed environment.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | NestJS 11, Node.js 22 |
| Database | MySQL 8 + Prisma |
| Cache / Queues | Redis 7 + BullMQ |
| Storage | Local or S3-compatible storage (AWS S3 / Cloudflare R2) |
| Auth | JWT, Google OAuth, Microsoft OAuth, TOTP 2FA |
| Billing | Stripe, NOWPayments |
| Observability | Sentry, Prometheus metrics, OpenTelemetry |
| Infra | Docker Compose, Nginx, GitHub Actions |

## Repository Setup

```bash
git clone https://github.com/<your-org>/researvia.git
cd researvia
```

Copy the backend bootstrap template before starting anything:

```bash
cp backend/.env.example backend/.env
```

## Local Setup

## Config Model

ResearVia should follow this split:

- `env / secret manager`: only bootstrap infrastructure and cryptographic secrets needed before the app can trust the database.
- `admin panel + DB`: business config, integration behavior, operational toggles, tracking URLs, queue behavior, provider preferences, and other runtime settings.

Examples that should stay bootstrap-only:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `REDIS_URL`
- provider master secrets such as Stripe, NOWPayments, Google, Microsoft, S3/R2, Sentry, and AI API keys

Examples that should be admin/DB-managed:

- mail system settings
- tracking base URL
- queue concurrency and async email behavior
- billing presentation behavior and provider enablement
- discovery source endpoints and non-secret operational flags
- cron expressions and sync schedules
- storage/display behavior that does not require master credentials

### Prerequisites

- Node.js 22.x
- npm 10+
- MySQL 8
- Redis 7
- Docker Desktop or Docker Engine if you want containerized services

### Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Backend defaults:

- API: `http://localhost:3001/v1`
- Swagger: `http://localhost:3001/api/docs`
- Health: `http://localhost:3001/v1/health`

### Frontend

```bash
cd frontend
npm install
npm run build
npm run dev
```

Frontend default:

- App: `http://localhost:3000`

## Docker Setup

Development compose:

```bash
docker compose up --build
```

Useful commands:

```bash
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f worker
docker compose down
```

Production compose image references are defined in [docker-compose.prod.yml](/abs/path/e:/project/email-marketing/profcrm/docker-compose.prod.yml).

## Production Setup

### 1. Infrastructure

- Provision MySQL 8 with backups enabled.
- Provision Redis with persistence and authentication.
- Provision an object store if you do not want local file storage.
- Provision a public domain for the frontend and API.
- Provision Stripe and NOWPayments accounts if billing is enabled.
- Provision Gmail and Microsoft OAuth apps if external mailbox auth is enabled.

### 2. Required Bootstrap Secrets

Populate `backend/.env` or your deployment secret manager with at least:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `FRONTEND_URL`
- `APP_URL` or `BACKEND_URL`
- `REDIS_URL`

Everything else that is not required to boot the app should be treated as admin/DB-managed runtime config.

### 3. Backend Build + Migrations

```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run build
```

### 4. Frontend Build

```bash
cd frontend
npm ci
npm run build
```

The frontend is configured for Next.js standalone output. CI should verify that `.next/standalone/server.js` exists after build.

## Deployment Guide

### GitHub Actions + GHCR

The repo includes a CI/CD workflow in [.github/workflows/deploy.yml](/abs/path/e:/project/email-marketing/profcrm/.github/workflows/deploy.yml) that should:

- install dependencies
- generate Prisma client
- run backend tests
- build frontend and backend
- build Docker images
- verify standalone Next.js output
- optionally push images and deploy on `main`

### VPS / Docker Compose

1. Build or pull the backend and frontend images.
2. Copy `docker-compose.prod.yml` to the server.
3. Provide `.env.production` with the runtime secrets.
4. Run database migrations before traffic cutover.
5. Start `api`, `worker`, `frontend`, and `nginx`.
6. Confirm `/v1/health`, frontend load, Redis connectivity, and billing webhooks.

## Billing Setup

### Stripe

Required bootstrap secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_STARTER_MONTHLY`
- `STRIPE_PRICE_ID_STARTER_YEARLY`
- `STRIPE_PRICE_ID_PRO_YEARLY`

Price/product mapping is better kept in DB/admin config long term.

### Stripe Webhook Setup

1. In Stripe, add a webhook endpoint pointing to `https://<api-domain>/v1/webhooks/stripe`.
2. Subscribe at minimum to:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Save the signing secret to `STRIPE_WEBHOOK_SECRET`.
4. Trigger a test event and verify the subscription event queue receives a job.

### NOWPayments Setup

Required bootstrap secrets:

- `NOWPAYMENTS_API_KEY`
- `NOWPAYMENTS_IPN_SECRET`

Operational values that should ideally move to admin/DB:

- `NOWPAYMENTS_API_URL`
- `NOWPAYMENTS_SUPPORTED_CURRENCIES`
- `NOWPAYMENTS_SUCCESS_URL`
- `NOWPAYMENTS_CANCEL_URL`
- `NOWPAYMENTS_IPN_CALLBACK_URL`

Set the IPN callback URL to `https://<api-domain>/v1/webhooks/nowpayments` unless you intentionally override it.

## Redis Worker Setup

The worker process runs `node dist/workers/index.js`.

For Docker Compose production:

- keep `api` and `worker` as separate processes
- point both to the same `DATABASE_URL`
- point both to the same `REDIS_URL`

Before launch, verify:

- queue creation works
- jobs transition to completed
- worker heartbeat records are updating
- stuck-job thresholds are sane for your traffic profile

## Admin-Managed Settings

The repo already exposes admin-managed mail settings via:

- `GET /v1/admin/mail-settings`
- `POST /v1/admin/mail-settings`

Current DB-backed admin settings include:

- system mailbox domain and SMTP/IMAP hosts
- mailbox provisioning toggle
- cPanel integration values
- email queue enablement
- async email sending toggle
- email send concurrency
- mailbox sync concurrency
- tracking base URL

Additional DB-backed runtime settings already wired:

- `billing.nowpayments.api_url`
- `billing.nowpayments.supported_currencies`
- `billing.nowpayments.success_url`
- `billing.nowpayments.cancel_url`
- `billing.nowpayments.ipn_callback_url`
- `billing.stripe.price_ids.<planSlug>.<monthly|yearly>`
- `email.allow_fallback`
- `ai.provider`
- `ai.anthropic.model`
- `discovery.openalex.base_url`
- `discovery.openalex.mailto`
- `scholarships.sources.<source>.endpoint`
- `app.public_backend_url`
- `storage.public_base_url`

If you want the platform to become fully admin-configured, the next step is to introduce a broader `system_settings` domain for billing, discovery, cron, storage, and integration behavior.

## Troubleshooting

- `Prisma migrate deploy` fails: confirm MySQL is reachable and `DATABASE_URL` includes the correct schema and credentials.
- Redis-related startup failures: set `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`; production requires Redis.
- Stripe checkout returns demo mode: `STRIPE_SECRET_KEY` is missing.
- NOWPayments webhook rejected: verify the raw body is preserved and `NOWPAYMENTS_IPN_SECRET` matches the dashboard value.
- Frontend build succeeds but container fails: confirm standalone output exists and `server.js` is copied from `.next/standalone`.
- OAuth login fails: re-check callback URLs, client IDs, client secrets, and consent-screen publishing state.
- Email sending fails: verify account credentials, daily limits, and the selected provider path (`system`, `smtp`, `gmail`, or `outlook`).

## GitHub Repository Readiness

### Repository Description Suggestion

`ResearVia helps students discover professors, scholarships, and research opportunities with outreach workflows, application tracking, and usage-based billing.`

### Suggested Topics

`nextjs`, `nestjs`, `prisma`, `mysql`, `redis`, `bullmq`, `stripe`, `nowpayments`, `saas`, `edtech`, `research`, `academic-outreach`

### Release Checklist

- Confirm branding is consistently `ResearVia`.
- Regenerate Prisma client and apply all production migrations.
- Build backend, frontend, and Docker images from a clean checkout.
- Verify Stripe and NOWPayments webhook endpoints in staging.
- Verify worker heartbeats, queue processing, and scheduled jobs.
- Validate OAuth redirect URIs for Google and Microsoft.
- Confirm Sentry DSN, traces sample rate, and alert routing.
- Confirm object storage bucket, credentials, and upload permissions.
- Review seeded demo data for public exposure risk.
- Tag the release and attach rollout notes.

### Public Beta Checklist

- Remove unsupported dataset-size and performance claims.
- Replace placeholder domains, email addresses, and clone URLs.
- Verify signup, login, password reset, and 2FA flows.
- Verify paid checkout, failed payment handling, coupon redemption, and crypto confirmation.
- Verify monthly credit reset idempotency.
- Verify professor, scholarship, and opportunity unlock billing protections.
- Verify daily email send limits and AI credit deductions.
- Verify legal pages, support contact, and incident owner are configured.

## Environment Reference

The full backend environment template lives in [backend/.env.example](/abs/path/e:/project/email-marketing/profcrm/backend/.env.example).

## Additional Launch Notes

Launch checklists and public-beta prep notes are in [docs/launch-readiness.md](/abs/path/e:/project/email-marketing/profcrm/docs/launch-readiness.md).
