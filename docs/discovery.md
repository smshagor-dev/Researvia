# University and professor discovery

ResearVia stores universities and professors in first-party MongoDB collections so the student experience does not depend on a paid search provider.

## Data quality

Records include provenance fields such as `source`, `sourceUrl`, `retrievedAt`, and `lastVerifiedAt`. Unknown information stays empty; the application must not fabricate professor email addresses, publications, affiliations, deadlines, or research facts.

Only records with `status=PUBLISHED` are returned to student/public discovery APIs.

## APIs

- `GET /api/v1/universities` — paginated university search.
- `GET /api/v1/universities/:slug` — published university detail.
- `GET /api/v1/professors` — paginated professor search with country, research-area and university filters.
- `GET /api/v1/professors/:slug` — published professor detail.

Search is backed by MongoDB indexes and all endpoints are rate-limited. Production indexes are explicitly provisioned because Mongoose auto-indexing is disabled in production.

## Data sources

The schema supports manual/admin records plus free/open providers such as OpenAlex, ROR and ORCID. Provider sync/import is a separate ingestion layer; the discovery UI never assumes data that has not been ingested and verified.
