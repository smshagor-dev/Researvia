# ProfCRM — Professor Outreach, Scholarship & Research CRM Platform

A full-stack SaaS platform for academic outreach: discover professors, manage email campaigns, track scholarship applications, and leverage AI for research matching.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Node.js 22, NestJS 11 |
| Database | MySQL 8.0 + Prisma ORM |
| Cache / Queue | Redis 7 + BullMQ |
| Storage | S3-compatible (Cloudflare R2) |
| Auth | JWT, Google OAuth, Microsoft OAuth, TOTP 2FA |
| AI | Anthropic Claude (streaming) |
| Billing | Stripe |
| Infra | Docker, Nginx, GitHub Actions CI/CD |

## Quick Start (Docker)

```bash
# 1. Clone repository
git clone https://github.com/your-org/profcrm.git && cd profcrm

# 2. Copy environment files
cp backend/.env.example backend/.env

# 3. Build and start all services
docker compose up --build

# 4. Seed demo data, if needed
docker compose exec api npx prisma db seed

# 5. Access the platform
#   Frontend:   http://localhost:3000
#   API:        http://localhost:3001/v1
#   Swagger:    http://localhost:3001/api/docs
#   Admin:      http://localhost:3000/admin/dashboard
```

**Default Admin:** `admin@profcrm.com` / `Admin@123456`

## Local Development (without Docker)

### Prerequisites
- Node.js 22+
- MySQL 8.0
- Redis 7

### Backend

```bash
cd backend
cp .env.example .env         # fill in DB_URL and REDIS_URL
npm install
npx prisma db seed
npm run start:dev            # auto-runs pending migrations, http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev                  # http://localhost:3000
```

## Key Features

### Discovery
- **50,000+ professors** indexed from OpenAlex, ORCID, Crossref, ROR
- Filter by country, university, research area, h-index, funding status
- Verified institutional email addresses (domain-matched + MX-checked)
- Professor profile pages with publications, research areas, AI match score

### Email CRM
- Multi-account support: personal SMTP, Gmail OAuth, Outlook OAuth
- Full conversation threading with inbound/outbound tracking
- Open tracking via pixel, reply detection via inbox sync
- Scheduled sending, drafts, attachment support

### AI Features
- **Outreach email generation** — personalized to professor's research (streaming SSE)
- **Follow-up generator** — context-aware based on thread history
- **Research match score** — 0-100 compatibility score with breakdown
- **Scholarship recommendations** — AI-ranked matching to your profile

### Scholarship Database
- Fully funded, partially funded, stipend-only scholarships
- Deadline tracking with color-coded urgency
- Save and track application status
- Email reminders before deadlines

### Subscriptions
| Plan | Price | Credits | Email Reveals |
|---|---|---|---|
| Free | $0 | 20/mo | 5/mo |
| Starter | $9.99/mo | 100/mo | 20/mo |
| Pro | $29.99/mo | 500/mo | 100/mo |
| Enterprise | $99.99/mo | 2000/mo | Unlimited |

## Project Structure

```
profcrm/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── modules/            # Feature modules (25+)
│   │   ├── shared/             # Prisma, Redis, Encryption
│   │   ├── common/             # Guards, interceptors, decorators
│   │   ├── cron/               # Scheduled jobs
│   │   └── queues/             # BullMQ queue definitions
│   └── prisma/
│       ├── schema.prisma       # 30+ models
│       └── seed.ts             # Initial data
├── frontend/                   # Next.js App Router
│   └── src/
│       ├── app/
│       │   ├── (auth)/         # Login, Register, Forgot Password
│       │   ├── (dashboard)/    # User panel pages
│       │   └── admin/          # Admin panel pages
│       ├── lib/
│       │   ├── api/            # Axios client + all API modules
│       │   ├── hooks/          # React Query hooks
│       │   └── stores/         # Zustand (auth store)
│       └── components/         # Reusable components
├── nginx/conf/                 # Nginx reverse proxy config
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production
└── .github/workflows/          # CI/CD pipeline
    └── deploy.yml
```

## Environment Variables

Copy `backend/.env.example` to `backend/.env`. Key variables:

```env
DATABASE_URL=mysql://profcrm:pass@localhost:3306/profcrm_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=<32+ char secret>
ENCRYPTION_KEY=<32 char hex>
GOOGLE_CLIENT_ID=<optional>
ANTHROPIC_API_KEY=<optional - enables AI features>
STRIPE_SECRET_KEY=<optional - enables billing>
```

All optional variables have sensible fallbacks (demo mode).

## API Documentation

Swagger UI is available at `http://localhost:3001/api/docs` when running.

Key endpoint groups:
- `POST /v1/auth/register` — User registration
- `POST /v1/auth/login` — Login (supports 2FA)
- `GET /v1/professors` — Search professors
- `POST /v1/professors/:id/reveal-email` — Reveal email (5 credits)
- `GET /v1/scholarships` — Search scholarships
- `POST /v1/ai/generate-outreach` — AI email generation (SSE stream)
- `GET /v1/ai/match-score/:professorId` — Research match score
- `GET /v1/email-threads` — Email CRM inbox
- `POST /v1/subscriptions/checkout` — Start Stripe checkout

## Data Sources

| Source | Usage |
|---|---|
| [ROR](https://ror.org) | University/institution metadata |
| [OpenAlex](https://openalex.org) | Professor profiles, publications, concepts |
| [Crossref](https://crossref.org) | Publications, DOIs |
| [ORCID](https://orcid.org) | Researcher identity and affiliations |

## Security

- JWT RS256 access tokens (15-min TTL) + refresh token rotation
- AES-256-GCM field encryption for SMTP passwords and OAuth tokens
- TOTP-based 2FA with backup codes
- Rate limiting per IP and per user (Redis-backed)
- Soft-delete with PII anonymization for GDPR compliance
- Email verification domain + MX record matching

## License

MIT — see [LICENSE](LICENSE)
