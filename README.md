# Zahira AI Agent

Production-grade, Portuguese-only AI-powered WhatsApp assistant platform. SendPulse handles WhatsApp transport; a custom backend owns all intelligence (OpenAI + RAG + persistent memory + sessions). Includes a Next.js admin dashboard.

## Stack

- Backend: Node.js, Express, TypeScript, Prisma, Zod, BullMQ
- Database: PostgreSQL + pgvector, Redis
- AI: OpenAI (GPT chat + `text-embedding-3-small`) via a swappable `AIProvider`
- Frontend: Next.js 15, TypeScript, Tailwind, TanStack Query, Zustand, React Hook Form
- Infra: Docker Compose, Nginx, Ubuntu VPS

## Monorepo layout

```
apps/        backend (API + worker) and frontend (admin dashboard)
packages/    types and shared (schemas, constants, utils)
docker/      Dockerfiles + Postgres init
nginx/       reverse proxy config
scripts/     backup and ops scripts
docs/        ARCHITECTURE.md, API.md, SENDPULSE.md
```

## Local development

Prerequisites: Node 20+, pnpm 9, Docker.

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env   # fill in OPENAI_API_KEY and secrets

# 3. Start Postgres + Redis
docker compose -f docker-compose.dev.yml up -d

# 4. Apply schema + seed (admin, prompts, settings, samples)
pnpm --filter @zahira/backend exec prisma migrate dev
pnpm --filter @zahira/backend prisma:seed

# 5. Run services (separate terminals)
pnpm --filter @zahira/backend dev         # API on :4000
pnpm --filter @zahira/backend dev:worker  # BullMQ worker
pnpm --filter @zahira/frontend dev        # dashboard on :3000
```

Default admin: `admin@zahira.com` / value of `SEED_ADMIN_PASSWORD`.

## Production (Docker Compose)

```bash
cp .env.example .env   # set production secrets, DATABASE_URL, REDIS_URL, domain
docker compose up -d --build
```

The backend container runs `prisma migrate deploy` on start. Seed once:

```bash
docker exec zahira_backend pnpm --filter @zahira/backend prisma:seed
```

Nginx proxies `/` to the frontend and `/api` to the backend. Add TLS certs under `nginx/certs` and extend `nginx/nginx.conf` with a 443 server block (Let's Encrypt / certbot).

### Backups

Schedule `scripts/backup.sh` via cron (daily). It runs `pg_dump` against the `zahira_postgres` container and prunes old archives.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/API.md](docs/API.md)
- [docs/SENDPULSE.md](docs/SENDPULSE.md)
