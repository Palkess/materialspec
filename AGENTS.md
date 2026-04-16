# Materialspec — Agent Instructions

Materialspec is a bilingual (Swedish/English) web application for construction companies to create, manage, and export material cost specifications. Users build structured line-item estimates with automatic VAT grouping, then export to Excel or PDF.

---

## Quick Start

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env: set SESSION_SECRET, ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD
# Ensure API_HOST_PORT and PUBLIC_API_URL match (default: both 3001)

# Start the full dev stack (hot-reload, Adminer included)
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up --build

# App: http://localhost:4321 | API: http://localhost:3001 | Adminer: http://localhost:8080
```

Migrations and admin seed run automatically on API boot.

---

## Boundaries — Do not modify without explicit human review

| Boundary | Reason |
|----------|--------|
| `packages/shared/src/constants.ts` — VAT_RATES, UNITS | Swedish VAT is legally fixed; units are a domain contract |
| `packages/shared/src/schemas.ts` — Zod schemas | Single source of truth for API and frontend validation |
| `apps/api/src/db/schema.ts` — Drizzle schema | Schema changes require a migration; accidental changes break prod |
| `apps/api/drizzle/` — migration files | Never edit generated migrations; generate new ones instead |
| `apps/api/src/auth/lucia.ts` — Lucia config | Auth adapter misconfiguration silently breaks all sessions |
| `apps/web/src/lib/i18n.ts` — namespace registration | Adding a namespace here without the JSON files breaks the app |
| `docker-compose.yml` — service definitions | Port or health check changes affect all dependent services |
| `.env` / `.env.example` — environment variables | Production secrets; never commit `.env` |

---

## Architecture summary

**Monorepo:** `apps/api` (Hono + tRPC + Drizzle), `apps/web` (Astro SSR + React), `packages/shared` (schemas, constants, i18n, money).

**API:** Hono v4. tRPC procedures in three routers — `auth`, `specs`, `admin`. Two plain GET routes for file export (`/specs/:id/export.xlsx`, `/specs/:id/export.pdf`). Auth via Lucia v3 session cookies (argon2 hashing).

**Frontend:** Astro v5 in `output: "server"` mode with `@astrojs/node` v9 adapter. React 19 islands mounted with `client:load`. All URLs prefixed `/sv/` or `/en/` (Swedish default). Auth guards are client-side via `useAuthGuard(lang)` — the API is the real security boundary.

**Database:** Postgres 16. Drizzle ORM. `numeric` columns map to TypeScript `string` — always wrap in `new Decimal(str)` before arithmetic. Soft delete via `deletedAt` timestamp.

**Shared package:** The only place for Zod schemas, VAT rates, units, and money utilities. Do not duplicate in api or web.

---

## Key conventions

**Money arithmetic:** Use `decimal.js` via `packages/shared/src/money.ts`. Never use JS `number` for money. `roundForDisplay(value: Decimal)` takes a `Decimal` object — wrap strings first: `new Decimal(str)`.

**Numeric strings from Postgres:** `numeric(x,y)` returns trailing zeros (`"0.2500"`, `"5.000"`). Normalize before API calls: `parseFloat(taxRate).toString()`, `quantity.replace(/\.?0+$/, "") || "0"`. This normalization lives in `SpecEditor.tsx` `onSave()`.

**Zod schemas:** `packages/shared/src/schemas.ts` is authoritative. The form-level `specFormSchema` in `SpecEditor.tsx` is intentionally looser (allows empty item names). Do not replace it with `specUpdateSchema`.

**Hono routing:** Never use `route.:ext` dot notation for named params — use explicit routes (`/export.xlsx`, `/export.pdf`).

**Drizzle aggregation:** Use `LEFT JOIN` + `GROUP BY` for per-spec aggregates. Correlated subqueries with `${column}` in `sql<>` templates emit bound parameters, not column references — counts always return 0.

**i18n:** All UI strings go through i18next. No hardcoded Swedish/English in TSX. Astro layouts import JSON directly. Add keys to both `sv` and `en` JSON files simultaneously. Restart the dev server after adding new keys.

**`@astrojs/node` version:** Pin to v9.x while Astro is on v5.x. v10 requires Astro v6 and crashes on boot with a `sessionDrivers` error.

---

## Known bugs and workarounds

| Bug | Symptom | Workaround |
|-----|---------|------------|
| SpecEditor silent save failure | Saving does nothing when any item row has an empty name | `specFormSchema` (local, loose) used as form resolver; `onSave()` filters empty rows |
| Hono `export.:ext` pattern | Export returns `{"error": "Invalid format"}` | Use explicit `/export.xlsx` and `/export.pdf` routes |
| Drizzle `sql<>` correlated subquery | `itemCount` and `grandTotal` always 0 | `LEFT JOIN items` + `GROUP BY` in `specs.list` |
| `@astrojs/node` v10 boot crash | `sessionDrivers` not found in `astro/config` | Pinned to `@astrojs/node` v9.x |
| Postgres numeric trailing zeros | API Zod rejects `"0.2500"` — silent save failure on edit | Normalize in `onSave()`: `parseFloat(taxRate).toString()` |
| `roundForDisplay()` with string | `TypeError: value.toFixed is not a function` | Always pass `new Decimal(str)` — never a plain string |

---

## Domain rules

- **Swedish VAT only:** 25%, 12%, 6%, 0%. No other rates valid.
- **SEK only.** No multi-currency.
- **No stored totals.** Net, tax, and gross are always derived on read.
- **Soft delete.** Specs set `deletedAt`; hard delete never happens.
- **No email.** Password reset links are delivered out-of-band by an admin.
- **Admin cannot read spec contents.** `listByUser` returns only `id` and `name`.
- **Last-admin guard.** Demoting the last admin is rejected in a DB transaction.
- **User content is never translated.** Spec names, item names, responsible person — stored as typed.

---

For detailed reference files, see `docs/agent/` — these are loaded automatically by Claude Code via CLAUDE.md.
