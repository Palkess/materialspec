# Architectural Decisions

## When to consult this file

Consult when making or evaluating architectural or design choices, or when you want to understand why something is built the way it is before proposing a change.

---

## ADR-001 — Monorepo with npm workspaces (2026-04-15)

**Context:** The project has three distinct concerns — API, frontend, and shared types/constants — that need to share code without a separate npm publish step.

**Decision:** npm workspace monorepo with `apps/api`, `apps/web`, `packages/shared`. No build step needed for shared package consumption in dev.

**Consequences:** All workspaces see each other's type changes immediately. Docker images are built with workspace-aware `npm ci`. Adding a new workspace requires updating the root `package.json` and relevant Dockerfiles.

---

## ADR-002 — Astro SSR mode with `@astrojs/node` adapter (2026-04-16)

**Context:** Astro defaults to static output. Dynamic routes like `/specs/[id]/edit` require either `getStaticPaths()` (impossible at runtime for DB-generated IDs) or SSR mode.

**Decision:** `output: "server"` + `@astrojs/node` adapter (standalone mode). Pin to `@astrojs/node` v9.x while Astro is on v5.x — v10 requires Astro v6.

**Consequences:** All Astro pages are server-rendered. No `getStaticPaths()` needed. The production Dockerfile CMD is `node apps/web/dist/server/entry.mjs`. See **bugs.md BUG-004** for the version constraint.

---

## ADR-003 — Client-side auth guards (2026-04-16)

**Context:** Astro SSR pages could theoretically check auth server-side, but this requires reading the session cookie in every Astro page's frontmatter and setting up Lucia outside the tRPC context.

**Decision:** Auth is enforced at the API layer (every tRPC procedure, every export route). The frontend uses client-side guards via `useAuthGuard(lang)` which redirects on mount if the session check fails. Login/signup pages redirect authenticated users away via `useEffect`.

**Consequences:** There is a brief flash of the page shell before redirect for unauthenticated users — acceptable trade-off. The API is the real security boundary; unauthenticated requests never return data. See **bugs.md** — this is a known and accepted UX trade-off, not a security issue.

---

## ADR-004 — `packages/shared` as single source of truth for schemas and constants (2026-04-15)

**Context:** Zod schemas, VAT rates, and measurement units need to be consistent between API validation and frontend form validation.

**Decision:** All Zod schemas, domain constants, and money utilities live exclusively in `packages/shared`. Neither `apps/api` nor `apps/web` defines their own copies.

**Consequences:** Changing a schema is a single edit. The frontend `zodResolver` and the API `.input()` are guaranteed in sync. The trade-off: `packages/shared` must be kept framework-agnostic (no Hono, no React imports).

---

## ADR-005 — Separate form schema from API schema in SpecEditor (2026-04-16)

**Context:** `specUpdateSchema` requires `name: z.string().min(1)` on every item. The editor allows empty trailing rows (PRD requirement: silently discard on save). Using `specUpdateSchema` directly as the `zodResolver` caused silent submission failures whenever any unfilled row existed.

**Decision:** `SpecEditor.tsx` defines a local `specFormSchema` that allows empty item names. `onSave()` filters empty rows and normalizes numeric strings before calling the API, which then validates against the strict API schema.

**Consequences:** The form can always be submitted if the spec name is filled. The API schema remains strict. Cross-reference: **bugs.md BUG-001**.

---

## ADR-006 — Export as plain GET routes, not tRPC (2026-04-15)

**Context:** tRPC procedures return JSON. File downloads need to stream binary with `Content-Disposition: attachment` so the browser triggers a native download dialog.

**Decision:** Two dedicated Hono GET routes (`/specs/:id/export.xlsx`, `/specs/:id/export.pdf`) outside tRPC. They re-implement session validation by reading the Lucia cookie directly.

**Consequences:** Export links are plain `<a href>` tags — no client-side JS needed for downloads. The session validation code is duplicated (not via tRPC context). Use explicit route names — not `export.:ext` pattern. Cross-reference: **bugs.md BUG-002**.

---

## ADR-007 — Swedish VAT rates and units are compile-time constants (2026-04-15)

**Context:** Swedish VAT brackets (25%, 12%, 6%, 0%) are defined by law and do not change frequently. Measurement units are a fixed domain list.

**Decision:** `VAT_RATES` and `UNITS` are readonly arrays in `packages/shared/src/constants.ts`. They are not configurable at runtime or via the database.

**Consequences:** Adding a new VAT rate requires a code change and redeploy. This is acceptable — Swedish VAT rates change at most once per decade. The benefit is that the UI dropdowns and API validation are always in sync with a single edit.

---

## ADR-008 — Explicit LEFT JOIN for spec list aggregates (2026-04-16)

**Context:** The spec list needs `itemCount` and `grandTotal` per specification. Correlated subqueries using `sql<>` template literals with `${specifications.id}` don't work in Drizzle — the column reference becomes a bound parameter, causing counts to always return 0.

**Decision:** Use `LEFT JOIN items ON items.specificationId = specifications.id` with `GROUP BY` for the `list` query.

**Consequences:** One join instead of two subqueries — actually cleaner SQL. Any future aggregation on the list query should follow the same JOIN pattern. Cross-reference: **bugs.md BUG-003**.

---

## ADR-009 — Generic `app_setting` key/value table for runtime admin configuration (2026-04-18)

**Context:** Admins need to toggle features (starting with self-registration) at runtime without a redeploy. Options were: env vars (requires redeploy), per-feature boolean columns (one migration per toggle), or a generic key/value table.

**Decision:** A single `app_setting` table with `key text PK, value jsonb NOT NULL, updated_at timestamptz, updated_by uuid FK`. The API exposes per-setting typed procedures (`admin.settings.setSignupEnabled`) rather than a generic `set(key, value)` endpoint, preserving tRPC's end-to-end type safety while keeping the schema flexible.

**Consequences:** New admin-controlled toggles require a new `admin.settings.setX` procedure and a `seedAppSettings()` upsert for the default — no new migration needed. The `updatedBy` FK is `uuid` (matching `user.id`) — do not use `text` or the FK constraint will fail (type mismatch). Each new default must be added to `seedAppSettings.ts`; forgetting this leaves the key absent and all reads fail-closed (treat as disabled).

---

## Anti-patterns

**Correlated subqueries in Drizzle `sql<>` templates** — `${column}` in a subquery emits a bound parameter, not a column reference. All aggregations use `LEFT JOIN` + `GROUP BY`. (See ADR-008, bugs.md BUG-003)

**`export.:ext` in Hono route patterns** — Hono 4 does not reliably split path parameters on dots within a segment. (See ADR-006, bugs.md BUG-002)

**Using the API Zod schema as a React form resolver directly** — the API schema's `min(1)` on item names prevents submission of any spec with unfilled rows. (See ADR-005, bugs.md BUG-001)

---

## How to contribute to this file

Add an ADR entry when: you make a meaningful architectural or technology choice that isn't obvious from the code, you intentionally deviate from a common pattern, or you explicitly reject an approach. Date-stamp every entry. Link to bugs.md if the decision is the root cause of a known issue.
