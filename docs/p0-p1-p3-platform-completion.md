# P0 + P1 + P3 Platform Completion

This tracker has been reconciled against the implemented ResearVia codebase and CI rather than the original planning checklist. A checked item has working persistence/service/API or UI paths in the repository and is covered by the platform validation flow where applicable.

## P0 — Core platform completion

- [x] Scholarship/opportunity automatic matching with reasons, dedupe, cooldown and notification delivery.
  - Evidence: `src/server/matching/academic-match.service.ts`, `src/server/models/AcademicMatchAlert.ts`, notification/job integration.
- [x] Periodic academic feed synchronization and reconciliation.
  - Evidence: `src/server/feeds/feed-sync.service.ts`, `src/server/feeds/feed.service.ts`, `src/server/models/AcademicFeedSource.ts`, background jobs/admin source controls.
- [ ] Required CI/status-check enforcement on `main`.
  - Repository CI is ready and gates dependency audit, lint, typecheck, automated tests, and production build in `.github/workflows/ci.yml`.
  - External GitHub repository configuration is still required: protect `main` (or add a ruleset) and require the CI `quality` check before merge. As of the final audit, `main` is unprotected and no repository ruleset exists. This setting cannot be changed through the currently available GitHub integration.
- [x] End-to-end regression coverage for core discovery, matching, saves, notifications and applications.
  - Evidence includes integration/unit suites for matching notifications, application workflows, saved items, productivity flows, profile sections, mailbox, imports/enrichment, deliverability, and operational health.

## P1 — High-value academic workflow completion

- [x] Research Labs discovery, matching, save, compare and outreach flows.
  - Evidence: `src/server/models/ResearchLab.ts`, lab API/dashboard routes, saved/compare/outreach integration.
- [x] First-class Department and Degree Program hierarchy.
  - Evidence: `src/server/models/Department.ts`, `src/server/models/AcademicProgram.ts`, program discovery/admin APIs and dashboard flows.
- [x] Confidential recommendation/referee request portal with signed expiring access.
  - Evidence: recommendation request models/services plus `/api/v1/referee/[token]` and `/referee/[token]` flows.
- [x] Document/CV/SOP/research workflow needed for the application lifecycle.
  - Evidence: student document/CV/research services, `src/server/applications/application.service.ts`, `application-packet.service.ts`, readiness/timeline/task workflows and application dashboard APIs.
- [x] Calendar/deadline/contact/outreach completion.
  - Evidence: `CalendarEvent`, `ApplicationTask`, `AcademicContact`, outreach campaign/recipient models, `src/server/outreach/outreach.service.ts`, and corresponding dashboard/API routes.

## P3 — Advanced operations and mail completion

- [x] External IMAP synchronization engine.
  - Evidence: `src/server/email/imap-sync.service.ts`, mailbox settings/test/sync controls and durable message persistence.
- [x] Mail aliases and sender identities.
  - Evidence: `src/server/email/system-mail-alias.service.ts`, alias APIs/settings UI, inbound routing, compose/draft/reply identity selection, scheduled-mail and vacation identity preservation.
- [x] Scheduled send.
  - Evidence: `src/server/email/scheduled-mail.service.ts`, delayed durable jobs, attachment persistence, cancellation/retries and scheduled-mail dashboard.
- [x] Auto-reply / vacation responder.
  - Evidence: `src/server/email/vacation-responder.service.ts`, loop prevention, sender cooldown, durable jobs, alias preservation and settings UI.
- [x] User import/export.
  - Evidence: `src/server/profile/user-data-portability.service.ts`, `/api/v1/me/data-portability`, validation/merge controls and dashboard UI.
- [x] Admin provider/feed/mail/push/queue health views.
  - Evidence: `src/server/admin/operational-health.service.ts`, admin operations UI/API, job inspection/replay support and `operational-health.integration.test.ts`.
- [x] Deliverability and abuse controls.
  - Evidence: `src/server/email/deliverability.service.ts`, delivery-event/suppression models, Mailgun feedback handling, general/outreach rate limits, admin suppression controls and `deliverability.integration.test.ts`.
- [x] Advanced operational tests and observability.
  - Evidence: operational-health and deliverability integration suites, queue/provider/feed/mail/push health signals, high-severity dependency audit gate, Node 24 CI, and Mongoose 9 compatibility cleanup.

## Release-hardening status

- Next.js and `eslint-config-next` are on the patched 16.3.3 release used by this completion wave.
- Nodemailer is on 9.0.6 and `npm audit --audit-level=high` is a required CI step.
- CI uses Node 24 with `actions/checkout@v5` and `actions/setup-node@v5`.
- Mongoose duplicate/reserved-key warnings were cleaned up without renaming persisted legacy fields, and deprecated `findOneAndUpdate({ new: true })` return semantics were migrated in the exercised core/auth/profile/mail/job paths.
- The completion gate remains: dependency audit, lint, typecheck, automated tests and production build must all be green before a completion PR is merged.

## Remaining external repository setting

The application/code completion scope is complete. The only known item outside the codebase is GitHub merge enforcement: enable branch protection or a repository ruleset for `main` and require the CI `quality` status check before merging.
