# Platform operations

## Worker

ResearVia uses a MongoDB-backed durable job queue. Run at least one worker alongside the web process:

```bash
npm run worker
```

The queue uses atomic claims, leases, retry backoff, idempotency keys, and stale-lock recovery. Admins can inspect jobs and safely retry failed/retrying jobs or cancel pending/retrying jobs.

## Email integrations

Account verification and password recovery use generic SMTP. Student mailbox connection is optional and supports Google/Gmail and Microsoft/Outlook OAuth. Provider tokens are encrypted before persistence. If OAuth credentials are missing, the connection flow reports that the integration is not configured instead of simulating success.

## Outreach

Professor outreach resolves the recipient from the stored professor record rather than trusting a client-supplied recipient address. Drafts can be sent immediately or scheduled. Follow-ups and provider synchronization are processed by the durable worker.

## Documents

Student documents use private MongoDB GridFS storage. Metadata is owner-scoped and file access/delete operations verify ownership. Supported document types are intentionally restricted and executable uploads are not allowed.

## AI and deterministic fallbacks

Recommendations are deterministic and explainable by default. Writing tools have deterministic/template fallbacks. An optional OpenAI-compatible endpoint can enhance writing only when configured. The UI must preserve the distinction between deterministic and AI-generated output.

## Imports and provenance

Admins can preview CSV/JSON imports and OpenAlex results. Invalid rows are visible before confirmation. Confirmed imports are processed by the worker and land as `DRAFT`; they require an explicit publishing decision before they can appear to students.

## Roles

- `STUDENT`: student workspace only
- `ADMIN`: admin console, imports, content moderation, jobs, and audit visibility
- `SUPER_ADMIN`: all admin privileges plus account role/status mutation

Sensitive administrator actions create audit records. Administrators cannot suspend or delete their own active administrator account through the user-management endpoint.

## Deployment checklist

1. Configure `MONGODB_URI`, strong secrets, `APP_URL`, and SMTP.
2. Use HTTPS and secure production cookies.
3. Start the Next.js web process.
4. Start at least one worker process.
5. Configure Google/Microsoft OAuth only if mailbox connections are needed.
6. Keep `AI_PROVIDER=disabled` unless a compatible endpoint is intentionally configured.
7. Verify `/api/health` and `/api/ready`.
8. Require the CI quality pipeline before deployment.
