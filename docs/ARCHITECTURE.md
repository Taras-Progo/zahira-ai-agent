# Architecture

Zahira AI Agent is a Portuguese-only, AI-powered WhatsApp assistant platform. SendPulse is the transport layer; all intelligence lives in the backend.

## Components

- `apps/backend` - Node + Express + TypeScript API and BullMQ worker.
- `apps/frontend` - Next.js 15 admin dashboard.
- `packages/types` - shared API contracts and enums.
- `packages/shared` - shared Zod schemas, constants, utilities.
- PostgreSQL + pgvector - relational data and vector store.
- Redis - cache, rate limiting, and BullMQ job queue.

## AI processing pipeline (POST /api/chat)

1. Resolve user (by phone) and load/continue session (inactivity timeout).
2. Persist the incoming user message.
3. Detect intent (LLM classifier with Portuguese heuristic fallback).
4. Load tunables from `system_settings`.
5. Retrieve top-k RAG context (pgvector cosine), top long-term memories, rolling summary, recent messages, and the active system prompt - in parallel.
6. Assemble the prompt (system + business context + memories + summary + recent turns).
7. Call the AI provider (OpenAI by default; swappable via the `AIProvider` interface). On failure, return a safe Portuguese fallback.
8. Derive `ai_exit` from intent (END_SESSION cue overrides).
9. Persist the assistant message and an `ai_runs` observability row.
10. Side effects: BOOKING creates a booking; SUPPORT creates a handoff; END_SESSION closes the session.
11. Enqueue async jobs (memory extraction, summarization, analytics) so the reply is never blocked.

## Background jobs (BullMQ)

- `embedding` - regenerate embeddings when a service/knowledge entry changes (or is soft-deleted).
- `memory` - extract durable customer facts after a turn.
- `summary` - roll up the conversation every N messages.
- `analytics` - append analytics events.

## Provider abstraction

`apps/backend/src/modules/ai/providers/ai-provider.interface.ts` defines `AIProvider`. `openai.provider.ts` implements it. Add Claude/Gemini by implementing the same interface and selecting it via `AI_PROVIDER`.

## Data model highlights

- Polymorphic `embeddings` table shared by services and knowledge_base (`vector(1536)`, HNSW cosine index).
- Versioned prompts (`prompts` + `prompt_versions`) with rollback.
- `ai_runs` for per-turn debugging. `bookings` for structured booking requests. `session_summaries` for token-efficient context.
- Soft deletes (`deleted_at`) on services and knowledge_base.
