# Student profile and onboarding

ResearVia keeps one `StudentProfile` document per student. The profile is private application data and is used to drive future professor, scholarship, and opportunity recommendations.

## Onboarding

The onboarding flow collects four groups of information:

1. Academic background: country, institution, degree, field, graduation year, GPA.
2. Research profile: research interests, skills, languages.
3. Goals: target degrees, target countries, funding preference, preferred research areas.
4. Optional public academic links and a short bio.

Completion requires country, current university, current degree, field of study, at least one research interest, one skill, one target degree, and one target country. The server validates these rules; the client cannot mark onboarding complete by itself.

## API

- `GET /api/v1/me/profile` returns the authenticated student's profile.
- `PATCH /api/v1/me/profile` updates validated profile fields.
- `POST /api/v1/me/onboarding/complete` performs final server-side completion checks and records the completion timestamp.

All state-changing profile requests use the same-origin protection used by authentication routes and are rate-limited per user.

## MongoDB indexes

Production Mongoose auto-indexing remains disabled. The profile subsystem explicitly provisions its unique `userId` index and supporting indexes before profile operations, matching the auth subsystem's production index strategy.
