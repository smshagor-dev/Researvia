# ResearVia Architecture

## Direction

ResearVia is being rebuilt as one full-stack Next.js application using the Node.js runtime and MongoDB. The legacy split Next.js/NestJS application remains preserved in `main` history while the production rebuild is developed on `full-platform-build`.

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

## Target module flow

```text
Browser / Server Components
        |
Next.js Route Handlers / Server Actions
        |
Validation + authorization
        |
Domain services
        |
Repositories
        |
MongoDB / GridFS
```

Background workers live in the same repository and run as a separate Node process only when durable asynchronous work is required.
