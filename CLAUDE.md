# Materialspec — Claude Code Instructions

Materialspec is a bilingual (Swedish/English) web application for construction companies to create, manage, and export material cost specifications. Users build structured line-item estimates with automatic VAT grouping, then export to Excel or PDF.

---

## Quick Start

```bash
cp .env.example .env
# Edit .env: SESSION_SECRET, ADMIN_EMAIL, ADMIN_INITIAL_PASSWORD
# Ensure API_HOST_PORT and PUBLIC_API_URL both point to the same port (default 3721)

docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up --build
# Web: http://localhost:4321 | API: http://localhost:3721 | Adminer: http://localhost:8080
```

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

---

## Reference Files

Consult these files only when the condition applies — do not load all of them by default:

- @docs/agent/conventions.md — when writing, editing, or reviewing code
- @docs/agent/architecture.md — when navigating the codebase or proposing structural changes
- @docs/agent/decisions.md — when making or evaluating architectural or design choices
- @docs/agent/bugs.md — when debugging, investigating errors, or working around known issues
- @docs/agent/workflows.md — when running, building, testing, or deploying
- @docs/agent/skills.md — when onboarding or assessing unfamiliar parts of the stack
- @docs/agent/context.md — when interpreting domain-specific terms or business logic
