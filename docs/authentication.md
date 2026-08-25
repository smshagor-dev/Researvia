# Authentication

ResearVia uses first-party opaque sessions backed by MongoDB. Authentication is implemented inside the Next.js application; there is no separate auth backend.

## Implemented flows

- Student registration
- Email verification
- Verification email resend
- Login
- Remember-me sessions
- Logout
- Current-session lookup
- Forgot password
- Password reset
- Revocation of all active sessions after a password reset

## Session model

The browser receives only a cryptographically random opaque session token in an HttpOnly cookie. MongoDB stores only a SHA-256 hash of that token. Production cookies use the `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`, and `Path=/`.

Normal sessions expire after 7 days. Remember-me sessions expire after 30 days. Revoked and expired sessions cannot authenticate.

## Verification and reset tokens

Verification and reset links use 256-bit random opaque tokens. Only token hashes are stored. Both token collections use TTL indexes, and tokens are atomically claimed before use to prevent replay.

- Verification link lifetime: 24 hours
- Password reset link lifetime: 60 minutes
- Password reset revokes every existing active user session

Raw verification, reset and session tokens must never be logged.

## Production indexes

The production MongoDB connection deliberately keeps Mongoose `autoIndex` disabled. The auth subsystem explicitly provisions its required indexes through `Model.createIndexes()` on first use, with a per-process promise guard. This ensures unique user-email and token/rate-limit TTL indexes are not dependent on development-only auto-index behavior.

## Passwords

Passwords are hashed with Node.js `scrypt` using a per-password random salt. New passwords must contain 12-128 characters.

## Email

Account verification and password reset use generic SMTP through Nodemailer. No paid email provider is required. Production registration/recovery requires a working SMTP configuration.

Required runtime values for email flows:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_FROM`
- `SMTP_USER` / `SMTP_PASSWORD` when the SMTP server requires authentication

## Abuse and CSRF protection

Auth endpoints enforce MongoDB-backed fixed-window rate limits. Identifiers are hashed before being stored in rate-limit buckets. Browser state-changing requests are protected using same-origin validation plus `SameSite=Lax` cookies.

Reverse proxies must overwrite trusted client-IP headers (`X-Real-IP` / `X-Forwarded-For`) rather than accepting arbitrary values from the public internet.

## Routes

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

## UI

The auth experience follows the professional neutral patterns used by the Vercel Next.js Admin Dashboard and shadcn/ui ecosystem, adapted for ResearVia. Database/auth logic from the Postgres template is not used; ResearVia keeps its MongoDB implementation.
