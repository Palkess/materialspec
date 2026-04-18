# Plan — Admin toggle for public user self-registration

## Context

Today, anyone can reach `/sv/signup` or `/en/signup` and create an account. The operator has no way to close registration without a code change and redeploy. We want admins to flip self-registration on/off at runtime.

When the toggle is **on** (the default), behavior is unchanged. When **off**:

- The "Sign up" link on the login page is hidden.
- `/sv/signup` and `/en/signup` show a "Registration is disabled" message instead of the form.
- The `auth.signup` tRPC procedure rejects with `FORBIDDEN`, regardless of UI.

This also establishes a generic `app_setting` key/value table so future admin-controlled settings don't each need their own migration.

---

## Design decisions

| # | Decision |
|---|---|
| 1 | Storage: generic `app_setting` key/value table (jsonb values) to accommodate future settings. |
| 2 | Default: `signupEnabled = true` — preserves current behavior on upgrade. |
| 3 | Public read: new `auth.getPublicSettings` tRPC `publicProcedure` returning `{ signupEnabled: boolean }`. |
| 4 | When disabled, `/signup` renders an informational message (not a silent redirect). |
| 5 | API enforcement: inline check in `auth.signup` throwing `FORBIDDEN` with `errors.auth.signupDisabled`. |
| 6 | Admin UI: new `/admin/settings` page (sv + en Astro shells + `AdminSettings.tsx`). |
| 7 | Schema: `app_setting(key text PK, value jsonb NOT NULL, updated_at timestamptz default now(), updated_by text FK user.id)`. |
| 8 | Write endpoint: per-setting `admin.settings.setSignupEnabled({ enabled })` + `admin.settings.getAll` for the admin page. |
| 9 | i18n: reuse `admin`, `auth`, `errors` namespaces — no new namespace (avoids touching `i18n.ts`). |
| 10 | Nav: update `AdminNavLink.tsx` to render "Users" and "Settings" links when admin. |
| 11 | Seed: new `seedAppSettings()` called from `main()` alongside `seedAdmin()`, idempotent. |
| 12 | Testing: one Playwright E2E test exercising the full toggle loop. |

---

## Files changed

### Created
- `apps/api/drizzle/0001_cute_stepford_cuckoos.sql` — migration for `app_setting` table
- `apps/api/src/auth/seedAppSettings.ts` — idempotent seed for default settings row
- `apps/api/src/trpc/admin.settings.router.ts` — `getAll` + `setSignupEnabled` admin procedures
- `apps/web/src/pages/sv/admin/settings.astro` — admin settings page (Swedish)
- `apps/web/src/pages/en/admin/settings.astro` — admin settings page (English)
- `apps/web/src/components/AdminSettings.tsx` — toggle UI for admin settings
- `apps/web/e2e/admin-settings.spec.ts` — E2E test: full toggle loop

### Modified
- `apps/api/src/db/schema.ts` — added `appSettings` table definition
- `apps/api/src/index.ts` — import + call `seedAppSettings()`
- `apps/api/src/trpc/auth.router.ts` — added `getPublicSettings`, signup enforcement
- `apps/api/src/trpc/admin.router.ts` — mounted `settingsAdminRouter`
- `apps/web/src/components/AdminNavLink.tsx` — now renders Users + Settings links
- `apps/web/src/components/LoginForm.tsx` — conditional signup link
- `apps/web/src/components/SignupForm.tsx` — disabled message when signup off
- `packages/shared/i18n/sv/admin.json` — settings keys
- `packages/shared/i18n/en/admin.json` — settings keys
- `packages/shared/i18n/sv/auth.json` — signup.disabled keys
- `packages/shared/i18n/en/auth.json` — signup.disabled keys
- `packages/shared/i18n/sv/errors.json` — auth.signupDisabled key
- `packages/shared/i18n/en/errors.json` — auth.signupDisabled key

---

## Verification

1. `docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up --build`
2. Check Adminer: `app_setting` table has row `{ key: 'signupEnabled', value: true }`.
3. Log in as admin → `/sv/admin/settings` → toggle off → "Inställningen har sparats".
4. Log out → login page: no "Skapa konto" link.
5. Visit `/sv/signup` → heading "Registrering är avstängd", no form.
6. Direct API call → `FORBIDDEN`.
7. Toggle back on → link and form return.
8. E2E: `cd apps/web && npx playwright test admin-settings.spec.ts`
