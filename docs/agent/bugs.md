# Known Bugs and Gotchas

## When to consult this file

Consult when debugging, investigating errors, or working around known issues. Also consult before touching money arithmetic, Drizzle queries, Hono routing, or numeric string handling.

---

## When to update this file

Add an entry when you discover a confirmed bug with a known workaround, a suspected issue that has observable symptoms but no confirmed root cause, or a non-obvious gotcha that caused real confusion. Remove entries when a bug is fixed at the root — do not leave stale workaround entries that no longer apply.

---

## Confirmed bugs with workarounds

### BUG-001 — SpecEditor silent save failure on specs with empty item rows

**Status:** Confirmed. Workaround in place.

**Symptom:** Pressing Save on the spec editor does nothing when any item row exists with an empty name field.

**Root cause:** Using `specUpdateSchema` as the `zodResolver` causes `handleSubmit` to fail validation silently (it never calls `onSave`) because the API schema requires `name: z.string().min(1)` on every item, including unfilled rows.

**Workaround:** `SpecEditor.tsx` uses a local `specFormSchema` that allows empty item names. `onSave()` filters empty rows before the API call. Do not replace `specFormSchema` with `specUpdateSchema` in the form resolver.

**Related decision:** decisions.md ADR-005.

---

### BUG-002 — Hono `export.:ext` route pattern returns wrong ext value

**Status:** Confirmed. Fixed by using explicit routes.

**Symptom:** Clicking Excel or PDF export returns `{"error": "Invalid format"}`.

**Root cause:** Hono 4 does not reliably parse named parameters that follow a dot within a path segment. `c.req.param("ext")` returns an unexpected value (possibly including query string or full suffix).

**Workaround:** Two explicit routes `GET /specs/:id/export.xlsx` and `GET /specs/:id/export.pdf` sharing a handler function. Do not consolidate back into a single parameterized route.

**Related decision:** decisions.md ADR-006.

---

### BUG-003 — Drizzle `sql<>` correlated subqueries always return 0

**Status:** Confirmed. Fixed by using LEFT JOIN.

**Symptom:** `itemCount` and `grandTotal` in the spec list always show 0 even when items exist.

**Root cause:** `${specifications.id}` inside a `sql<>` template literal in a `select()` call emits a bound parameter (`$1`), not a column reference. The subquery `WHERE item.specification_id = $1` receives no binding and matches nothing.

**Workaround:** Use `LEFT JOIN items ON items.specificationId = specifications.id` with `GROUP BY` in the list query (`specs.router.ts`). Do not use correlated subqueries in Drizzle `sql<>` templates.

**Related decision:** decisions.md ADR-008.

---

### BUG-004 — `@astrojs/node` v10 crashes on boot with Astro v5

**Status:** Confirmed. Pinned to v9.

**Symptom:** Web service crashes on startup: `"The requested module 'astro/config' does not provide an export named 'sessionDrivers'"`.

**Root cause:** `@astrojs/node` v10 requires Astro v6 (`peerDependencies: { astro: "^6.0.0" }`). The project is on Astro v5.18.x.

**Workaround:** `@astrojs/node` is pinned to `^9` (currently 9.5.5) in `apps/web/package.json`. Do not upgrade `@astrojs/node` to v10 until Astro is also upgraded to v6.

**Related decision:** decisions.md ADR-002.

---

### BUG-005 — Postgres numeric trailing zeros break API Zod validation

**Status:** Confirmed. Normalization in place.

**Symptom:** Saving an existing spec does nothing (form submission fails silently) because items loaded from the database have trailing zeros in numeric strings (e.g. `taxRate: "0.2500"`, `quantity: "5.000"`).

**Root cause:** Postgres `numeric(5,4)` returns `"0.2500"`. The API `itemInputSchema` checks `VAT_RATES.map(String)` which contains `"0.25"` — not `"0.2500"`. Validation fails silently.

**Workaround:** `SpecEditor.tsx` `onSave()` normalizes before sending to the API:
```ts
quantity: item.quantity.replace(/\.?0+$/, "") || "0"
pricePerUnit: item.pricePerUnit.replace(/\.?0+$/, "") || "0"
taxRate: parseFloat(item.taxRate).toString()
```
Do not remove this normalization step.

---

### BUG-006 — `roundForDisplay()` crashes when called with a plain string

**Status:** Confirmed. Fixed in export renderers.

**Symptom:** Export crashes with `TypeError: value.toFixed is not a function`.

**Root cause:** `roundForDisplay(value: Decimal)` calls `.toFixed(2)` which is a `Decimal` method, not a native `Number` method. `item.pricePerUnit` from Drizzle is a plain string.

**Workaround:** Always wrap: `roundForDisplay(new Decimal(item.pricePerUnit))`. This applies to any `numeric` column from Drizzle passed to money utilities.

---

## Suspected issues (unconfirmed)

### SUSPECTED-001 — Auth guard flash of content on protected pages

**Status:** Suspected / known trade-off.

**Symptom:** On slow connections, the authenticated page shell (layout, nav) briefly renders before the client-side auth check redirects to `/login`.

**Likely cause:** Client-side-only auth guards (see decisions.md ADR-003). The Astro page renders unconditionally; the redirect happens after the React island mounts.

**Note:** This is a known trade-off of the current architecture, not a security issue — the API never returns data to unauthenticated requests. A full SSR auth check in Astro frontmatter would resolve the flash but requires Lucia to be initialized outside tRPC context.

---

## How to contribute to this file

Add confirmed bugs with a clear symptom, root cause, and workaround. Label suspected issues separately. Link to the relevant decision in decisions.md if the bug is caused by an architectural choice. Remove entries when bugs are fixed at the root (not just worked around). Keep workaround code comments in sync — if the code changes, update here.
