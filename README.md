# ResearVia

ResearVia is a free academic discovery, outreach, and application-management platform for students. The production rebuild uses one Next.js full-stack codebase with MongoDB.

## Product promise

Student functionality is free. ResearVia has no subscription, checkout, billing, paid credits, premium tier, or required paid AI service.

## Architecture

- Next.js 16 App Router + React 19 + strict TypeScript
- MongoDB + Mongoose
- Node.js runtime and server-only service modules
- Zod validation at API/config boundaries
- MongoDB-backed durable jobs; no mandatory Redis
- MongoDB GridFS for private student documents
- standards-compliant SMTP for account verification and recovery
- optional Google/Microsoft OAuth email integrations
- deterministic recommendation/writing fallbacks with optional OpenAI-compatible AI provider
- GitHub Actions quality pipeline and non-root Docker image

Development currently happens directly on `main`; the previous split frontend/backend implementation remains available in Git history.

## Student platform

### Authentication and account security

- registration and verified-account login
- real SMTP email verification and resend
- forgot/reset password with single-use tokens and session revocation
- opaque HttpOnly cookie sessions and remember-me sessions
- MongoDB-backed auth rate limiting and same-origin protection
- TOTP two-factor authentication
- encrypted TOTP secret storage
- ten single-use recovery codes
- login-time TOTP/recovery challenge
- security settings UI

### Academic profile and discovery

- four-step academic onboarding
- academic background, research interests, skills, languages, target degrees/countries, funding preferences, and academic links
- University directory/detail/filtering
- Professor directory/detail/filtering
- Scholarship directory/detail/filtering and trustworthy deadline states
- Opportunity directory/detail/filtering
- source/provenance metadata and published-record visibility gates

### Organization and applications

- saved professors, universities, scholarships, and opportunities
- collections, notes, tags, duplicate-safe saves, and owner-only access
- scholarship/opportunity comparison
- application tracker with manual or source-backed entries
- stages, deadlines, timeline, notes, tasks, list and Kanban-style views

### Documents

- private CV, transcript, SOP, proposal, and other document storage
- MongoDB GridFS
- owner-only read/delete
- MIME/type and size validation
- PDF/DOC/DOCX/TXT support

### Email accounts and professor outreach

- Gmail and Microsoft OAuth connection with PKCE/state validation
- encrypted provider access/refresh tokens and token refresh
- provider-backed sending and message metadata synchronization
- professor outreach drafts/campaigns
- server-resolved public professor contact data
- scheduled sends, retries, automatic follow-ups, and reply reconciliation
- no fake inbox or fake send success

### Recommendations and writing

- deterministic professor matching
- deterministic scholarship/opportunity recommendations
- explainable match score, matched reasons, gaps, and actions
- email/SOP/proposal writing tools
- deterministic/template fallback works with AI disabled
- optional OpenAI-compatible AI endpoint enhancement
- UI distinguishes deterministic output from AI-generated output

### Notifications and durable work

- notification center and unread state
- MongoDB-backed durable queue with leases, retries, exponential backoff, idempotency keys, stale-lock recovery, and job cancellation/retry controls
- worker process via `npm run worker`
- queue processors for outreach, follow-ups, email sync, and data imports

## Administration

Roles are `STUDENT`, `ADMIN`, and `SUPER_ADMIN`.

Admin console includes:

- operational overview
- user search and account review
- SUPER_ADMIN-only role/status mutations with self-lockout protection
- academic content moderation and publish/archive controls
- CSV/JSON import preview, validation, confirmation, and queued processing
- OpenAlex university/professor discovery import preview
- background job inspection/retry/cancel
- bounded audit log display
- server-side RBAC and audit records for sensitive changes

Imported records are `DRAFT` by default and are not student-visible until an administrator publishes them.

## Environment

Use `.env.example` as the deployment reference. Never commit secrets.

Core runtime values:

- `MONGODB_URI`
- `SESSION_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `APP_URL`

Account verification/recovery requires SMTP values. Gmail/Microsoft integrations are optional and activate only when their client credentials are configured. AI is optional and the core platform works with `AI_PROVIDER=disabled`.

## Commands

```bash
npm install
npm run dev
npm run worker
npm run lint
npm run typecheck
npm test
npm run build
npm run check
```

## Health

- `GET /api/health` — process health
- `GET /api/ready` — MongoDB readiness

## Production deployment

Run the Next.js web process and at least one worker process against the same MongoDB database. Use HTTPS in production, configure SMTP, and configure OAuth/AI credentials only for integrations you want to enable. The application does not require a paid infrastructure provider.

## Documentation

- [Architecture](docs/architecture.md)
- [Authentication](docs/authentication.md)
- [Student profile and onboarding](docs/profile-onboarding.md)
- [University and professor discovery](docs/discovery.md)
- [Scholarships and opportunities](docs/scholarships-opportunities.md)
- [Saved items](docs/saved-items.md)
- [Platform operations](docs/platform-operations.md)

## Validation policy

A feature is not considered production-validated until lint, TypeScript checks, automated tests, and the production build pass in CI. Integration credentials are never simulated as successful production connections.
