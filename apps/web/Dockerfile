# ── Stage 1: install deps ────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
# stub api so npm ci doesn't fail on missing workspace
COPY apps/api/package.json apps/api/package.json
RUN npm ci --workspace=@materialspec/web --workspace=@materialspec/shared --include-workspace-root

# ── Stage 2: build ───────────────────────────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace=@materialspec/web

# ── Stage 3: production image ────────────────────────────────
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared ./packages/shared
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY apps/web/package.json apps/web/package.json
COPY package.json ./
EXPOSE 4321
CMD ["node", "apps/web/dist/server/entry.mjs"]

# ── Dev target (used by docker-compose.dev.yml) ──────────────
FROM deps AS dev
WORKDIR /app
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
EXPOSE 4321
WORKDIR /app/apps/web
CMD ["npx", "astro", "dev", "--host", "0.0.0.0"]
