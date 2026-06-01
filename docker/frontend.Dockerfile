# Next.js admin dashboard image.
# Single-stage install keeps the full pnpm workspace so the `next` binary and
# workspace package symlinks resolve at runtime.
FROM node:22-slim
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/frontend ./apps/frontend

RUN pnpm install --frozen-lockfile=false

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm --filter @zahira/frontend build

ENV NODE_ENV=production
WORKDIR /app/apps/frontend
EXPOSE 3000
CMD ["pnpm", "start"]
