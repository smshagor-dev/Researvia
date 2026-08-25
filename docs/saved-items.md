# Saved items

Students can save published professors, universities, scholarships, and opportunities. A saved record is always scoped to the authenticated student; API callers never choose a user ID.

The compound unique index `(userId, itemType, targetId)` makes saving idempotent and prevents duplicates. Before a target is saved, ResearVia verifies that the referenced source record exists and is currently published.

Students can assign a collection name, private notes, and tags. Update and delete operations filter by both saved-item ID and authenticated `userId`, preventing cross-account IDOR access.

API:
- `GET /api/v1/me/saved`
- `POST /api/v1/me/saved`
- `PATCH /api/v1/me/saved/:id`
- `DELETE /api/v1/me/saved/:id`
