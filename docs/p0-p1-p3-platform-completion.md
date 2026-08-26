# P0 + P1 + P3 Platform Completion

This document tracks the end-to-end ResearVia completion wave on `feature/p0-p1-p3-platform-completion`.

## P0 — Core platform completion

- [ ] Scholarship/opportunity automatic matching with reasons, dedupe, cooldown and notification delivery
- [ ] Periodic academic feed synchronization and reconciliation
- [ ] Required CI/status-check enforcement readiness
- [ ] End-to-end regression coverage for core discovery, matching, saves, notifications and applications

## P1 — High-value academic workflow completion

- [ ] Research Labs discovery, matching, save, compare and outreach flows
- [ ] First-class Department and Degree Program hierarchy
- [ ] Confidential recommendation/referee request portal with signed expiring access
- [ ] Document/CV/SOP/research workflow gaps needed for the application lifecycle
- [ ] Calendar/deadline/contact/outreach completion where gaps remain

## P3 — Advanced operations and mail completion

- [ ] External IMAP synchronization engine
- [ ] Mail aliases and sender identities
- [ ] Scheduled send
- [ ] Auto-reply / vacation responder
- [ ] User import/export
- [ ] Admin provider/feed/mail/push/queue health views
- [ ] Deliverability and abuse controls
- [ ] Advanced operational tests and observability

## Completion gate

This PR is not considered complete until all implemented scopes pass lint, typecheck, automated tests and production build, and CI is green. Existing production functionality must remain backward-compatible.
