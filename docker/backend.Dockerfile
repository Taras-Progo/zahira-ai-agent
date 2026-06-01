# Backend image (API + worker share this image).
# Single-stage install keeps the full pnpm workspace (node_modules symlinks,
# tsx, prisma CLI) intact, and runs TypeScript directly via tsx — matching the
# dev runtime and avoiding raw-TS resolution issues from workspace packages.
FROM node:22-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @zahira/backend prisma:generate

ENV NODE_ENV=production
WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["pnpm", "start"]
