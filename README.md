# ResearVia

ResearVia is a free academic discovery and application-management platform for students. The production rebuild uses a single Next.js full-stack codebase with MongoDB.

## Product promise

Student functionality is free. ResearVia does not require subscriptions, checkout, billing, paid credits, or a premium tier.

## Current rebuild

The legacy split frontend/backend implementation is preserved in Git history on `main`. New production development is being carried out on `full-platform-build` with a clean architecture.

### Foundation included

- Next.js 16 full-stack App Router
- React 19 + strict TypeScript
- MongoDB + Mongoose
- Zod server environment validation
- production security headers baseline
- health and readiness endpoints
- initial indexed User model
- Vitest baseline
- GitHub Actions quality pipeline
- non-root multi-stage Docker image

## Planned production modules

Authentication, 2FA, student onboarding/profile, universities, professors, scholarships, opportunities, saved items, comparison, application tracking, outreach/email, MongoDB-backed jobs, notifications, GridFS documents, deterministic recommendations with optional free AI adapters, admin, security hardening, Playwright E2E, data import/provenance, and production operations.

## Requirements

- Node.js 22+ (Node.js 24 recommended)
- MongoDB Atlas or self-hosted MongoDB

## Environment

Copy `.env.example` to your deployment environment and provide secure values. Never commit secrets.

Mandatory runtime values currently include:

- `MONGODB_URI`
- `SESSION_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `APP_URL`

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

## Architecture

See [docs/architecture.md](docs/architecture.md).

## Status

This branch is an active ground-up production rebuild. Do not treat incomplete modules as production-ready until their implementation and acceptance tests land.
