# Architecture

## When to consult this file

Consult when navigating the codebase, proposing structural changes, adding new routes or components, or tracing data flow between layers.

---

## System overview

Materialspec is an npm-workspace monorepo with three workspaces:

```
apps/api      — Hono HTTP server + tRPC router (Node.js, TypeScript)
apps/web      — Astro SSR frontend + React islands (TypeScript)
packages/shared — Zod schemas, domain constants, money utilities, i18n JSON
```

All services run in Docker Compose. The stack boots with one command; see `workflows.md`.

---

## Service map

| Service       | Port  | Purpose                            |
|---------------|-------|------------------------------------|
| postgres      | 5432  | Primary database (Postgres 16)     |
| postgres-test | 5433  | Isolated test database             |
| api           | 3001  | Hono + tRPC + export routes        |
| web           | 4321  | Astro SSR (Node adapter)           |
| adminer       | 8080  | DB GUI (dev profile only)          |

---

## API layer (`apps/api`)

Entry point: `src/index.ts`

```
Hono app
├── GET  /health                       — liveness probe
├── GET  /specs/:id/export.xlsx        — authenticated Excel download
├── GET  /specs/:id/export.pdf         — authenticated PDF download
└── ALL  /trpc/*                       — tRPC batch endpoint

tRPC router (src/trpc/router.ts)
├── auth.*     — getPublicSettings, signup, login, logout, me, changePassword,
│                changeLocale, consumeResetToken
├── specs.*    — list, get, create, update, softDelete, duplicate
└── admin.*
    ├── users.*    — list, setAdmin, generateResetLink
    ├── specs.*    — listByUser, reassignOwner
    └── settings.* — getAll, setSignupEnabled
```

**Procedure tiers:**
- `publicProcedure` — no auth
- `protectedProcedure` — valid Lucia session required (throws UNAUTHORIZED)
- `adminProcedure` — protectedProcedure + `isAdmin` (throws FORBIDDEN)

**Auth:** Lucia v3 with DrizzlePostgreSQLAdapter, argon2 password hashing via `@node-rs/argon2`, session cookies.

**Export routes are plain GET, not tRPC** — this lets browsers download without client-side JS glue. The handler reads the Lucia session cookie directly, enforces ownership, then streams the response.

---

## Database layer (Drizzle ORM, Postgres 16)

Schema in `apps/api/src/db/schema.ts`. Table names are singular (Drizzle convention):

| Table                | Key columns                                           |
|----------------------|-------------------------------------------------------|
| `user`               | id, email (unique), name, passwordHash, locale, isAdmin |
| `session`            | id, userId, expiresAt (Lucia managed)                 |
| `password_reset_token` | userId, hashedToken (sha256), expiresAt, usedAt     |
| `specification`      | userId, name, description, responsiblePerson, deletedAt |
| `item`               | specificationId, sortOrder, name, unit, quantity, pricePerUnit, taxRate |
| `app_setting`        | key (PK), value (jsonb), updatedAt, updatedBy (FK user.id) |

**Drizzle maps `numeric` columns to TypeScript `string`.** Never do arithmetic on these strings directly — use `decimal.js` via the `money.ts` helpers.

Migrations live in `apps/api/drizzle/` and run automatically on API boot when `RUN_MIGRATIONS_ON_BOOT=true`.

---

## Frontend layer (`apps/web`)

Astro runs in `output: "server"` mode (SSR, `@astrojs/node` adapter). Pages are thin shells that mount React islands with `client:load`.

**Routing:** Astro i18n with `prefixDefaultLocale: true`. All URLs are prefixed `/sv/` or `/en/`. The root `/` redirects to `/sv/`.

```
src/pages/
├── index.astro                  — redirects to /sv/
├── sv/
│   ├── login.astro              — public
│   ├── signup.astro             — public
│   ├── reset-password.astro     — public (token-gated)
│   ├── account.astro            — protected
│   ├── index.astro              — redirects to /sv/specs
│   ├── specs/
│   │   ├── index.astro          — protected (spec list)
│   │   ├── new.astro            — protected (new spec editor)
│   │   └── [id]/edit.astro      — protected (edit spec)
│   ├── admin/users.astro        — admin only
│   └── admin/settings.astro    — admin only
└── en/  (mirror of sv/)
```

**Auth guards are client-side.** Astro pages render unconditionally; each React component calls `useAuthGuard(lang)` on mount and redirects to `/login` if the session check fails. The API enforces auth on every tRPC procedure and export route — this is the security boundary.

**tRPC client** (`src/lib/trpc.ts`): `httpBatchLink` pointing to `window.__API_URL__` (injected by AppLayout via `PUBLIC_API_URL` env var) with `credentials: "include"` for session cookies.

---

## Shared package (`packages/shared`)

Single source of truth for:
- **Zod schemas** (`src/schemas.ts`) — used by both tRPC `.input()` and React `zodResolver`
- **Domain constants** (`src/constants.ts`) — `VAT_RATES`, `UNITS`, `unitLabel(unit, locale)`
- **Money utilities** (`src/money.ts`) — `lineTotal`, `grandTotals`, `roundForDisplay`
- **i18n JSON** (`i18n/{sv,en}/*.json`) — 6 namespaces: common, auth, specs, errors, export, admin

The shared package is the only place domain constants and schemas live. Do not duplicate them in api or web.

---

## Data flow: creating and saving a spec

```
User fills SpecEditor form (react-hook-form + specFormSchema)
  → clicks Save
  → onSave() filters empty rows, normalizes numeric strings
  → trpc.specs.create.mutate() or trpc.specs.update.mutate()
  → tRPC validates against specCreateSchema / specUpdateSchema (packages/shared)
  → specs.router: INSERT specification + DELETE/INSERT items in transaction
  → returns { id }
  → frontend updates URL via window.history.replaceState (no full navigation)
```

---

## Data flow: export

```
User clicks Excel/PDF link (plain <a href>)
  → GET /specs/:id/export.{xlsx,pdf}?lang={sv|en}
  → API reads Lucia session cookie → validates session → enforces ownership
  → loads spec + items from DB
  → renderXlsx / renderPdf (apps/api/src/export/)
  → streams response with Content-Disposition: attachment
```

---

## How to contribute to this file

Update when: adding a new service, changing the tRPC router structure, adding new Astro pages, changing auth flow, or altering the export mechanism. Keep the service map and data flow diagrams in sync with reality.
