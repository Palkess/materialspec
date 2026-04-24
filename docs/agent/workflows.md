# Workflows

## When to consult this file

Consult when running, building, testing, or deploying the project.

---

## Local development

### Prerequisites
- Docker Desktop (or Docker Engine + Compose plugin)
- Node.js 20+ (for running host-side tools like Playwright)
- Copy `.env.example` to `.env` and set `API_HOST_PORT` and `PUBLIC_API_URL` consistently:
  ```
  API_HOST_PORT=3721
  PUBLIC_API_URL=http://localhost:3721
  ```

### Start the full dev stack

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up --build
```

Services available after startup:
- Web app: http://localhost:4321
- API: http://localhost:3721
- Adminer (DB GUI): http://localhost:8080

Migrations run automatically on API boot (`RUN_MIGRATIONS_ON_BOOT=true`). The seeded admin user is created from `ADMIN_EMAIL` + `ADMIN_INITIAL_PASSWORD` in `.env`.

Hot reload is active: editing `apps/api/src/**` or `apps/web/src/**` triggers reload inside the container via bind mounts.

### Restart a single service

```bash
docker compose restart api
docker compose restart web
```

---

## Building

```bash
# Build all workspaces
npm run build

# Build a specific workspace
npm run build --workspace=@materialspec/api
npm run build --workspace=@materialspec/web
```

---

## Type checking

```bash
# Root (all workspaces)
tsc --build

# Per workspace
npm run typecheck --workspace=@materialspec/api
npm run typecheck --workspace=@materialspec/web
npm run typecheck --workspace=@materialspec/shared
```

---

## Database migrations

Drizzle ORM handles migrations. Migrations live in `apps/api/drizzle/`.

```bash
# Generate a new migration after changing schema.ts
npm run drizzle:generate --workspace=@materialspec/api

# Apply migrations manually (outside Docker)
DATABASE_URL=<url> npm run drizzle:migrate --workspace=@materialspec/api
```

Inside Docker, migrations run automatically on boot.

---

## E2E tests (Playwright)

E2E tests require the full Docker Compose stack running (including `postgres-test`).

```bash
# Run all tests (headless)
cd apps/web && npx playwright test

# Run with UI
cd apps/web && npx playwright test --ui
```

`playwright.config.ts` runs `globalSetup` (`e2e/globalSetup.ts`) first — it polls `GET /health` until the API is ready. Test isolation uses unique email addresses per test (no `beforeEach` truncation currently).

Set these env vars for admin tests:
```
E2E_API_URL=http://localhost:3721
E2E_ADMIN_EMAIL=admin@example.com
E2E_ADMIN_PASSWORD=<your ADMIN_INITIAL_PASSWORD from .env>
```

---

## Adding a new i18n key

1. Add the key to `packages/shared/i18n/sv/<namespace>.json`
2. Add the same key (English value) to `packages/shared/i18n/en/<namespace>.json`
3. If adding a new namespace, also register it in `apps/web/src/lib/i18n.ts`
4. Restart the dev server — JSON imports are cached at module load time

---

## Adding a new tRPC procedure

1. Add the procedure to the relevant router in `apps/api/src/trpc/`
2. Export it via `appRouter` in `apps/api/src/trpc/router.ts`
3. The frontend tRPC client picks it up automatically via TypeScript inference — no manual client update needed
4. Add Zod input schema to `packages/shared/src/schemas.ts` if it's shared

---

## Adding a new Astro page route

Since the site is bilingual, every new page must be created in **both** `src/pages/sv/` and `src/pages/en/`. The pages are thin shells:

```astro
---
import AppLayout from "../../layouts/AppLayout.astro";
import MyComponent from "../../components/MyComponent";
---
<AppLayout title="..." lang="sv">
  <MyComponent lang="sv" client:load />
</AppLayout>
```

Protected pages need no server-side auth check — `useAuthGuard(lang)` in the component handles it.

---

## Production deployment

The `docker-compose.yml` (without the dev override) uses multi-stage Dockerfiles that produce lean production images. The API image copies `apps/api/drizzle/` into the image so migrations can run on boot.

Environment variables required in production:
- `DATABASE_URL`
- `SESSION_SECRET` (64+ random chars)
- `ADMIN_EMAIL` + `ADMIN_INITIAL_PASSWORD` (idempotent seed)
- `PUBLIC_API_URL` (the publicly accessible API URL, e.g. `https://api.example.com`)
- `RUN_MIGRATIONS_ON_BOOT=true`

---

## How to contribute to this file

Update when adding new scripts, changing the Docker setup, adding new test types, or changing the deployment process. Keep the "full dev stack" command and environment variable lists in sync with `docker-compose.yml` and `.env.example`.
