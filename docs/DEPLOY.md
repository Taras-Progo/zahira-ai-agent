# Deploying Zahira to a Cloudez (CreativeCode) server

Cloudez (white-labeled at `cloud.criative.codes`) provisions and manages an
Ubuntu cloud server. You get **SSH/root access**, plus a panel for DNS, SSL,
backups and monitoring. The whole Zahira stack ships as Docker containers, so we
deploy over SSH with Docker Compose and use the panel for the domain + TLS.

The stack (`docker-compose.yml`) runs 5 containers:

| Container | Role |
|-----------|------|
| `postgres` | PostgreSQL 16 + pgvector |
| `redis` | cache + BullMQ queue |
| `backend` | Express API (runs `prisma migrate deploy` on boot) |
| `worker` | BullMQ worker (embeddings, memory, summaries, analytics) |
| `frontend` | Next.js admin dashboard |
| `nginx` | reverse proxy (`/api` -> backend, `/` -> frontend) |

---

## 1. Prerequisites on the server

```bash
ssh root@YOUR_SERVER_IP

# Docker + Compose plugin (skip if already present)
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version

# Git
apt-get update && apt-get install -y git
```

## 2. Get the code

```bash
git clone <YOUR_REPO_URL> /opt/zahira
cd /opt/zahira
```

## 3. Production `.env`

```bash
cp .env.example .env
nano .env
```

Set these for production (everything else can stay):

```ini
NODE_ENV=production

# Point the browser app at your public domain (HTTPS)
NEXT_PUBLIC_API_URL=https://app.your-domain.com

# Strong DB credentials
POSTGRES_USER=zahira
POSTGRES_PASSWORD=<long-random-password>
POSTGRES_DB=zahira
# DATABASE_URL must use the compose service name `postgres` as host:
DATABASE_URL=postgresql://zahira:<long-random-password>@postgres:5432/zahira?schema=public

# Redis uses the compose service name `redis`:
REDIS_URL=redis://redis:6379

# 32+ char random secrets (openssl rand -hex 32)
JWT_ACCESS_SECRET=<random-32>
JWT_REFRESH_SECRET=<random-32>

# Real OpenAI key + models
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-5.5
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Strong webhook secret (also configured in SendPulse)
SENDPULSE_WEBHOOK_SECRET=<random>

# Lock CORS to your domain
CORS_ORIGIN=https://app.your-domain.com

# Initial admin (change before first seed!)
SEED_ADMIN_EMAIL=you@your-domain.com
SEED_ADMIN_PASSWORD=<strong-password>
```

> Generate secrets quickly: `openssl rand -hex 32`

## 4. Choose how TLS is terminated

**Option A — Cloudez panel terminates SSL (recommended, simplest).**
The panel's web server handles the domain + Let's Encrypt and reverse-proxies to
our stack. Run our `nginx` on a local-only HTTP port and point the panel proxy at
it. Use the override file:

```bash
docker compose -f docker-compose.yml -f docker-compose.cloudez.yml up -d --build
```

This binds nginx to `127.0.0.1:8080` (no 443). Then in the Cloudez panel create a
website/domain for `app.your-domain.com`, enable Let's Encrypt SSL, and set its
reverse-proxy/upstream target to `http://127.0.0.1:8080`.

**Option B — our nginx terminates SSL (no panel proxy).**
Put a real cert at `nginx/certs/fullchain.pem` and `nginx/certs/privkey.pem`,
switch the mounted config to the SSL variant, and let our nginx own 80/443:

```bash
mkdir -p nginx/certs   # place fullchain.pem + privkey.pem here
# edit docker-compose.yml nginx volume:
#   - ./nginx/nginx.ssl.conf:/etc/nginx/nginx.conf:ro
docker compose -f docker-compose.yml up -d --build
```

Make sure no other web server is already bound to ports 80/443 on the host.

## 5. Build, start, migrate, seed

`docker compose ... up -d --build` builds the images and starts everything. The
`backend` container runs `prisma migrate deploy` automatically on boot. Seed the
admin + Zahira data once:

```bash
# wait until backend is healthy, then:
docker compose exec backend pnpm prisma:seed
docker compose exec backend pnpm prisma:seed:zahira
```

## 6. Verify

```bash
docker compose ps
docker compose logs -f backend worker
curl -s http://127.0.0.1:8080/api/health   # Option A
# or https://app.your-domain.com/api/health once DNS+SSL are live
```

Then open `https://app.your-domain.com`, log in with the seeded admin, and use the
AI Test panel.

## 7. SendPulse webhook

In SendPulse, point the chatbot webhook at:

```
https://app.your-domain.com/api/chat
```

with header `x-webhook-secret: <SENDPULSE_WEBHOOK_SECRET>` (see `docs/SENDPULSE.md`).

---

## Day-2 operations

```bash
# Update to latest code
cd /opt/zahira && git pull
docker compose -f docker-compose.yml -f docker-compose.cloudez.yml up -d --build

# Logs
docker compose logs -f backend worker

# DB backup (also schedule via Cloudez panel)
bash scripts/backup.sh

# Restart a single service
docker compose restart backend
```
