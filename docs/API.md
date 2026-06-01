# API Reference

Base path: `/api`. Admin routes require `Authorization: Bearer <accessToken>`.
Errors use the envelope `{ "error": { "code", "message", "details?" } }`.

## Auth

- `POST /auth/login` - body `{ email, password }` -> `{ token, admin }` (sets httpOnly refresh cookie).
- `POST /auth/refresh` - uses refresh cookie -> `{ token }`.
- `POST /auth/logout` - clears the refresh cookie.
- `GET  /auth/me` - current admin.

## Chat (shared by SendPulse + AI Test Panel)

- `POST /chat` - auth: `X-Webhook-Secret` header OR admin Bearer token. Rate limited.
  - Request: `{ phone, message, session_id? }`
  - Response: `{ reply, ai_exit, intent, session_id, metadata: { retrieved_documents, tokens_used } }`

## Services (auth)

- `GET /services`
- `GET /services/:id`
- `POST /services` - `{ service_name, category?, description?, price?, duration?, faq?[], keywords?[] }` (auto re-embeds)
- `PUT /services/:id` (auto re-embeds)
- `DELETE /services/:id` (soft delete)

## Knowledge base (auth)

- `GET /knowledge`, `GET /knowledge/:id`
- `POST /knowledge` - `{ title, content, category? }` (auto re-embeds)
- `PUT /knowledge/:id`, `DELETE /knowledge/:id` (soft delete)

## Conversations (auth)

- `GET /conversations` - list with message counts.
- `GET /conversations/:sessionId` - full message history.

## Sessions (auth)

- `GET /sessions`, `GET /sessions/active`, `POST /sessions/:id/close`.

## Memory (auth)

- `GET /memory/:userId`
- `POST /memory` - `{ user_id, content, type?, relevance_score? }`
- `PUT /memory/:id`, `DELETE /memory/:id`

## Bookings (auth)

- `GET /bookings`, `PUT /bookings/:id` - `{ status?, notes? }`.

## Support / handoffs (auth)

- `GET /support`, `PUT /support/:id` - `{ status?, assigned_admin_id? }`.

## Prompts (auth)

- `GET /prompts`, `GET /prompts/:id/versions`
- `PUT /prompts/:id` - `{ content }` (creates a new active version)
- `POST /prompts/:id/rollback` - `{ versionId }`

## Settings (auth)

- `GET /settings`, `PUT /settings` - arbitrary key/value tunables.

## Analytics (auth)

- `GET /analytics/dashboard` -> KPIs.

## Health

- `GET /health` - public liveness.
- `GET /admin/health` (auth) - database, redis, openai, queue status.
