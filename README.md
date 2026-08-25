# ResearVia

ResearVia is a free academic discovery and application-management platform for students. The production rebuild uses one Next.js full-stack codebase with MongoDB.

## Product promise

Student functionality is free. ResearVia does not require subscriptions, checkout, billing, paid credits, or a premium tier.

## Current architecture

Development happens directly on `main`. The previous split frontend/backend implementation remains available in Git history, while the current tree is the clean Next.js + MongoDB rebuild.

### Implemented foundation

- Next.js 16 App Router full-stack application
- React 19 + strict TypeScript
- MongoDB + Mongoose
- Zod boundary/environment validation
- production security-header baseline
- health and readiness endpoints
- non-root multi-stage Docker image
- GitHub Actions lint/typecheck/test/build pipeline
- MongoDB 8-backed CI integration testing

### Authentication implemented

- Student registration
- real SMTP email verification
- verification resend
- verified-account login gate
- secure opaque HttpOnly cookie sessions
- remember-me sessions
- logout and current-user endpoint
- forgot password and single-use reset links
- password reset with active-session revocation
- MongoDB-backed auth rate limiting
- same-origin request protection
- auth lifecycle integration tests

See [docs/authentication.md](docs/authentication.md).

### Student onboarding and academic profile implemented

- four-step academic onboarding flow
- academic background, current degree and study field
- research interests, skills and languages
- target degrees, countries and funding preferences
- preferred research areas
- optional website, LinkedIn, GitHub, Google Scholar and ORCID links
- private/recommendation-only profile-use setting
- server-validated onboarding completion
- profile completion score
- authenticated profile read/update API
- production MongoDB profile indexes
- profile lifecycle integration tests
- professional responsive student dashboard shell
- editable academic profile page

See [docs/profile-onboarding.md](docs/profile-onboarding.md).

## UI baseline

The application uses a professional Next.js dashboard/authentication visual baseline inspired by the Vercel Next.js Admin Dashboard and shadcn/ui patterns, adapted to ResearVia. The template's Postgres/auth implementation is not used.

## Next production modules

Universities and professors are the next core discovery modules, followed by scholarships, opportunities, saved items, comparison, application tracking, outreach/email accounts, MongoDB-backed jobs, notifications, GridFS documents, deterministic recommendations with optional free AI adapters, admin, 2FA, expanded security hardening, Playwright E2E, data import/provenance, and production operations.

## Requirements

- Node.js 22+ (Node.js 24 recommended)
- MongoDB Atlas or self-hosted MongoDB
- Standards-compliant SMTP for account verification/password recovery

## Environment

Use `.env.example` as the deployment reference. Never commit secrets.

Core runtime values:

- `MONGODB_URI`
- `SESSION_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `APP_URL`

Verification/recovery additionally require SMTP configuration.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Health

- `GET /api/health` — process health
- `GET /api/ready` — MongoDB readiness

## Documentation

- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [Student profile and onboarding](docs/profile-onboarding.md)

## Status

Authentication and the student onboarding/profile foundation are implemented. The complete product remains under active module-by-module production development; later product modules should not be treated as complete until their implementation and acceptance tests land.
