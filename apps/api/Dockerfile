# ── Stage 1: install deps ────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
# stub web so npm ci doesn't fail on missing workspace
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace=@materialspec/api --workspace=@materialspec/shared --include-workspace-root

# ── Stage 2: build ───────────────────────────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace=@materialspec/api

# ── Stage 3: production image ────────────────────────────────
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/package.json apps/api/package.json
COPY package.json ./
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]

# ── Dev target (used by docker-compose.dev.yml) ──────────────
FROM deps AS dev
WORKDIR /app
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
EXPOSE 3001
CMD ["npx", "tsx", "watch", "apps/api/src/index.ts"]
