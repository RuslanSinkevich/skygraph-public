# syntax=docker/dockerfile:1.6
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json ./
COPY pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY examples ./examples
COPY deploy ./deploy

RUN pnpm install --frozen-lockfile || pnpm install
RUN node deploy/build-all.mjs

FROM caddy:2-alpine AS runner
COPY --from=builder /app/deploy/output /srv/skygraph
COPY deploy/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
