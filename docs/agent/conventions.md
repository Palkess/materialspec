# Conventions

## When to consult this file

Consult when writing, editing, or reviewing code in this repository. Not needed for deployment or debugging tasks.

---

## TypeScript

Strict mode is on across all workspaces. See `tsconfig.base.json` — do not relax `strict`, `noUncheckedIndexedAccess`, or `exactOptionalPropertyTypes` without discussion.

Path alias `@materialspec/shared` resolves to `packages/shared/src/index.ts`. Use it everywhere instead of relative `../../../packages/shared`.

---

## Zod schemas

`packages/shared/src/schemas.ts` is the single source of truth. **Never duplicate a schema in api or web.** The API uses schemas via `.input()`, the frontend via `zodResolver`.

The form-level schema (`specFormSchema` in `SpecEditor.tsx`) is intentionally looser than the API schemas — it allows empty item names so unfilled rows don't block submission. Items are filtered and normalized in `onSave()` before the tRPC call. Do not tighten `specFormSchema` to match the API schema.

---

## Money arithmetic

All money calculations go through `packages/shared/src/money.ts` which uses `decimal.js` with `ROUND_HALF_UP`. Rules:

- **Never use JS `number` for money.** All prices, quantities, and tax rates come from Postgres as strings (Drizzle maps `numeric` to `string`). Wrap in `new Decimal(value)` before any arithmetic.
- **Round only at display/export time**, never mid-calculation.
- `roundForDisplay(value: Decimal)` takes a `Decimal` object, not a string. Always construct `new Decimal(str)` first.
- The SQL `SUM` in `specs.list` uses raw Postgres arithmetic — this is acceptable for the list view approximation. Precise export totals use the `money.ts` helpers.

---

## i18n

- All user-visible strings go through i18next. No hardcoded English or Swedish strings in TSX or Astro templates.
- Translation keys live in `packages/shared/i18n/{sv,en}/*.json`. Six namespaces: `common`, `auth`, `specs`, `errors`, `export`, `admin`.
- `i18n.ts` must be kept in sync with any new namespaces or keys added to the JSON files.
- Astro layouts (`AppLayout.astro`, `AuthLayout.astro`) import JSON directly (not via i18next) since they can't use React hooks. Use `import svCommon from "...common.json"` and select by `lang` prop.
- User-entered content (spec names, item descriptions, responsible person) is **never translated** — stored and displayed exactly as typed.

---

## Numeric string normalization

Postgres `numeric(x,y)` returns trailing zeros: `quantity` → `"5.000"`, `taxRate` → `"0.2500"`. Before sending item data to the API:

```ts
quantity: item.quantity.replace(/\.?0+$/, "") || "0"
pricePerUnit: item.pricePerUnit.replace(/\.?0+$/, "") || "0"
taxRate: parseFloat(item.taxRate).toString()
```

This normalization lives in `SpecEditor.tsx` `onSave()`. Do not remove it — the API Zod schemas reject trailing-zero strings.

---

## Hono routing

Do **not** use dot notation in Hono route parameters (`/route.:ext`). Hono 4 does not reliably split on the dot — `c.req.param("ext")` may return unexpected values. Use explicit routes instead:

```ts
app.get("/specs/:id/export.xlsx", handler)
app.get("/specs/:id/export.pdf", handler)
```

---

## Drizzle queries

- Use `LEFT JOIN` + `GROUP BY` for aggregating item counts and totals per specification. Correlated subqueries with `${column}` inside `sql<>` templates are unreliable in Drizzle — the column reference becomes a bound parameter. See `specs.router.ts` `list` procedure.
- All ownership checks use `eq(specifications.userId, ctx.user.id)` inside the WHERE clause. Never skip this.
- Soft delete pattern: filter `isNull(specifications.deletedAt)` in every query that lists specs.

---

## React components

- Every component that calls tRPC is wrapped in `I18nextProvider` with `createI18n(lang)`. Do not call tRPC from a component that isn't inside a provider.
- `useAuthGuard(lang)` (`src/lib/useAuthGuard.ts`) is the standard hook for protected components. It redirects to `/login` on auth failure and exposes `{ user, checking }`.
- Popover menus must use `position: fixed` with coordinates from `getBoundingClientRect()` — the spec list table has `overflow-hidden` which clips absolute-positioned children.
- WCAG menu pattern: `role="menu"` on the popover, `role="menuitem"` on each item, `aria-haspopup="menu"` + `aria-expanded` on the trigger. Focus moves to first item on open; Escape returns focus to trigger.

---

## Anti-patterns

**We used `zodResolver(specUpdateSchema)` directly in SpecEditor — it caused silent form submission failures whenever any item row had an empty name (e.g. newly appended rows). Do not reintroduce.** Use `specFormSchema` (local, looser schema) for the form resolver; let the API schema enforce strictness after filtering.

**We used correlated subqueries in Drizzle `sql<>` for spec list aggregates — they always returned 0 because `${specifications.id}` became a bound parameter, not a column reference. Do not reintroduce.** Use `LEFT JOIN` + `GROUP BY`.

**We used `export.:ext` as a Hono route pattern — `c.req.param("ext")` returned the full suffix unparsed in some cases, causing "Invalid format" errors. Do not reintroduce.** Use explicit `.xlsx` and `.pdf` routes.

**We used `@astrojs/node` v10 with Astro v5 — v10 imports `sessionDrivers` from `astro/config` which doesn't exist in Astro v5, causing a boot crash. Do not upgrade `@astrojs/node` past v9.x until Astro is also upgraded to v6.**

**In E2E tests, direct tRPC POST requests must send the input as raw JSON — not wrapped in `{"json": input}`.** tRPC v11 `httpBatchLink` without a transformer sends mutations with the raw object as the body (e.g. `{"email":"...","name":"...","password":"..."}`). The `{"json": ...}` wrapper is a tRPC v10 artefact; using it in v11 causes Zod input parsing to fail with `BAD_REQUEST` before the handler is reached. Use `page.evaluate(() => fetch(..., { body: JSON.stringify(rawInput) }))` from within the browser context rather than Playwright's `request` API to ensure CORS and serialization match what the tRPC client sends.

---

## How to contribute to this file

Add an entry when: you discover a non-obvious convention while reviewing a PR, you explicitly reject a pattern in code review and want to document why, or you introduce a new convention that isn't enforced by tooling. Anti-patterns in particular should be added as soon as a pattern is rejected — not retroactively.
