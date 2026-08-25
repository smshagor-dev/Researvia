# Scholarships and opportunities

ResearVia stores scholarship and academic-opportunity records in MongoDB and only exposes records explicitly marked `PUBLISHED`.

Every record requires a real application URL and a source URL. Provenance fields record source type, retrieval time, and last verification time. Unknown deadlines remain unknown; the platform never manufactures a date.

## Deadline state

Display status is derived at read time:

- `CLOSED` when the known deadline is in the past.
- `CLOSING_SOON` when a known future deadline is within 30 days.
- `OPEN` when a known deadline is more than 30 days away.
- `UNKNOWN` when no trustworthy deadline exists.

## APIs

- `GET /api/v1/scholarships`
- `GET /api/v1/scholarships/:slug`
- `GET /api/v1/opportunities`
- `GET /api/v1/opportunities/:slug`

Both list APIs support pagination and filters and use production MongoDB indexes. Search routes are rate-limited and do not rely on a paid search provider.
