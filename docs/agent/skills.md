# Skills & Stack

## When to consult this file

Consult when onboarding to the project, assessing an unfamiliar part of the stack, or evaluating a new dependency.

---

## Tech stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| API framework | [Hono](https://hono.dev) v4 | Lightweight, fast, Cloudflare-compatible |
| API typing | [tRPC](https://trpc.io) v11 | End-to-end type safety, httpBatchLink |
| ORM | [Drizzle](https://orm.drizzle.team) | Postgres dialect; `numeric` maps to `string` |
| Database | PostgreSQL 16 | `numeric` types for all money columns |
| Auth | [Lucia](https://lucia-auth.com) v3 | Session cookies, Drizzle adapter |
| Password hashing | `@node-rs/argon2` | Argon2id, NOT bcrypt |
| Money arithmetic | [decimal.js](https://mikemcl.github.io/decimal.js/) | `ROUND_HALF_UP`; never native `number` |
| Frontend framework | [Astro](https://astro.build) v5 + React 19 | SSR mode, React islands |
| Astro adapter | `@astrojs/node` v9 | Standalone mode; pin to v9 for Astro v5 |
| Styling | [TailwindCSS](https://tailwindcss.com) v3 | Custom design tokens in `tailwind.config.mjs` |
| Form management | [react-hook-form](https://react-hook-form.com) v7 | `useFieldArray` for item rows |
| Drag & drop | [@dnd-kit](https://dndkit.com) | Keyboard sensor for accessibility |
| Validation | [Zod](https://zod.dev) v3 | `@hookform/resolvers/zod` for forms |
| Excel export | [ExcelJS](https://github.com/exceljs/exceljs) | Workbook/worksheet model |
| PDF export | [PDFKit](https://pdfkit.org) | Manual layout with fixed Y tracking |
| i18n | [i18next](https://www.i18next.com) + react-i18next | 6 namespaces, sv/en |
| E2E testing | [Playwright](https://playwright.dev) v1.59 | Against real Docker stack |
| Logging | [pino](https://getpino.io) | Structured JSON, API only |

---

## Design system

Custom Tailwind tokens in `apps/web/tailwind.config.mjs`:
- **`concrete-{950,900,800,700,600}`** — dark grey backgrounds (950 = darkest)
- **`safety-{500,400,300}`** — amber/yellow accent (primary CTA color)
- **`min-h-btn`** — `2.75rem` minimum button height (touch target)

Typography: Inter (system stack). All primary buttons use `bg-safety-500 text-concrete-950 uppercase tracking-wide font-bold`.

---

## Key library behaviors to know

**Drizzle `numeric` → TypeScript `string`:** Every money/quantity column comes out as a string. You must explicitly `new Decimal(str)` before arithmetic. See `bugs.md BUG-006`.

**Astro `import.meta.env`:** Only vars prefixed `PUBLIC_` are exposed to client code. `PUBLIC_API_URL` is set at build time (SSR) or injected via AppLayout's inline script.

**tRPC batch requests:** The client uses `httpBatchLink` — multiple queries fired in the same tick are batched into one HTTP request.

**Lucia v3 sessions:** Sessions are managed entirely via cookies. `lucia.readSessionCookie(cookieHeader)` reads the session ID; `lucia.validateSession(id)` validates and refreshes. Session attributes (email, name, locale, isAdmin) are merged from the user table.

**`@dnd-kit` keyboard sensor:** `KeyboardSensor` with `sortableKeyboardCoordinates` is wired for all sortable lists. Space picks up/drops, arrow keys move. This is required for WCAG compliance.

---

## Required knowledge for productive work

- **TypeScript strict mode** — all workspaces use strict. Non-null assertions require justification.
- **Zod v3 API** — schemas, transforms, `.refine()`, `.merge()`, `.omit()`.
- **react-hook-form `useFieldArray`** — the item row editor is built on this; understand `append`, `remove`, `move`, and the `fields` array.
- **Astro i18n routing** — understand `prefixDefaultLocale: true` and how Astro generates duplicate page trees for each locale.
- **Swedish VAT law** — four rates: 25%, 12%, 6%, 0%. These are the only valid values. See `context.md`.
- **PDFKit manual layout** — PDFKit does not auto-layout tables. All X/Y positions must be tracked manually. See `apps/api/src/export/pdf.ts` for the pattern.

---

## How to contribute to this file

Update when a new library is added, an existing library is upgraded to a version with breaking behavior changes, or when a library-specific gotcha is discovered that isn't covered in bugs.md (library behaviors that aren't bugs, just non-obvious). Keep the version numbers updated.
