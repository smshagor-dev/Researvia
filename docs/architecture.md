# ResearVia Architecture

## Direction

ResearVia is one full-stack Next.js application using the Node.js runtime and MongoDB. Active development happens directly on `main`. The previous split Next.js/NestJS implementation remains preserved in Git history only.

## Core principles

- Student-facing functionality is free. No billing, subscriptions, checkout, premium tiers, or paid credits.
- Core functionality must not require paid APIs.
- Route handlers are transport boundaries, not business-logic containers.
- Server-only services and repositories own business rules and persistence.
- MongoDB/Mongoose is the primary persistence layer.
- Durable jobs will use MongoDB leases rather than requiring Redis.
- Files will default to MongoDB GridFS behind a storage abstraction.
- External AI is optional; deterministic/rule-based features must keep the platform useful without AI credentials.
- Sensitive operations must be auditable and object-level authorization is mandatory.

## Current application flow

```text
Browser / Server Components
        |
Next.js Route Handlers
        |
Zod validation + authentication + authorization
        |
Domain services
        |
Mongoose models
        |
MongoDB / future GridFS
```

## Implemented domains

### Authentication

Authentication uses opaque random session tokens in HttpOnly cookies. Only token hashes are persisted. Email verification and password-reset tokens follow the same hashed-token pattern with TTL indexes and single-use semantics.

### Student profile and onboarding

Each student owns exactly one `StudentProfile`. Profile access is always derived from the authenticated session user ID; the client never supplies a target user ID. A four-step onboarding flow persists progress through validated profile APIs and only the server can mark onboarding complete after required academic fields are present.

The profile subsystem explicitly provisions production indexes because Mongoose automatic index creation is disabled in production.

### UI shell

Authenticated student pages use a reusable professional dashboard shell based on Vercel/shadcn-style dashboard conventions. The application does not inherit the reference template's database or authentication implementation.

## Background processing

Background workers will live in the same repository and run as a separate Node process only when durable asynchronous work is required. MongoDB-backed leases and idempotent processors will be used so Redis is not a mandatory dependency.
