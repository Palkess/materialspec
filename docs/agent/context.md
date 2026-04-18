# Domain Context

## When to consult this file

Consult when interpreting domain-specific terms, implementing business logic involving VAT or money, or when the correct behavior isn't obvious from the code alone.

---

## Domain glossary

### Specification (spec)
The core domain object. A "specification" in this app means a **material and labour cost estimate** — a list of line items with quantities, prices, and VAT rates, produced for a construction job. Not to be confused with a technical specification document.

### Item (line item / row)
One line in a specification. Has: name, description, unit, quantity, price per unit, VAT rate. Derived fields (tax, line total) are **never stored** — always computed on read.

### Responsible person (`responsiblePerson`)
Free-text field on a specification naming who is accountable for the estimate. Pre-filled with the creating user's name but editable. This is not a user reference — it's a plain string, deliberately so (the responsible person may not have an account).

### Grand total / gross
The total amount including VAT. `gross = net + tax`.

### Net
Pre-tax total. `net = Σ (quantity × pricePerUnit)` per item.

### Tax (moms)
The VAT amount. `tax = net × taxRate`. Each item stores its own `taxRate`.

### VAT group (momsgrupp)
Items grouped by their `taxRate`. The totals section breaks down tax by group. This is required for Swedish accounting — each VAT bracket must be reported separately on invoices.

---

## Swedish VAT rates

Swedish law defines exactly four VAT rates. These are compile-time constants in `packages/shared/src/constants.ts`:

| Rate | Typical use |
|------|-------------|
| 25% (`0.25`) | Most goods and services |
| 12% (`0.12`) | Food, hotel accommodation |
| 6% (`0.06`) | Books, newspapers, passenger transport |
| 0% (`0.00`) | Exported goods, certain financial services |

**Business rule:** No other VAT rate is valid. The UI dropdown only shows these four. The API rejects any other value. Do not add runtime VAT rate configuration — this is a deliberate constraint (see decisions.md ADR-007).

---

## Measurement units

Fixed list in `packages/shared/src/constants.ts`:
`mm, cm, m, cl, l, g, hg, kg, pcs, h`

Units are pure display labels — there is **no unit conversion** in the system. `5 m` and `500 cm` are different items with no relationship.

**Locale display:** the unit `pcs` is displayed as `st` in Swedish (`"st"` = styck). All other units are locale-invariant. Use `unitLabel(unit, locale)` from `packages/shared/src/constants.ts` whenever displaying a unit to the user — do not format units directly. This applies to UnitSelect dropdowns, ItemRow, and export renderers (PDF/Excel).

---

## Money arithmetic rules

- All amounts are in **SEK (Swedish Kronor)**.
- **No multi-currency support.** SEK only.
- Arithmetic uses `decimal.js` with `ROUND_HALF_UP` throughout.
- **Never round mid-calculation.** Round only at display or export time using `roundForDisplay()`.
- Postgres stores `quantity` as `numeric(12,3)` (3 decimal places), `pricePerUnit` as `numeric(12,2)` (2 decimal places), `taxRate` as `numeric(5,4)` (4 decimal places).
- Drizzle returns these as strings. Always wrap in `new Decimal(str)` before arithmetic.

**Line total formula:**
```
net   = quantity × pricePerUnit
tax   = net × taxRate
gross = net + tax
```

**Grand total:** sum of `net`, `tax`, `gross` across all items, then grouped by `taxRate` for the VAT breakdown.

---

## Locale-specific formatting

| Locale | Decimal separator | Thousand separator | Currency display |
|--------|-------------------|--------------------|-----------------|
| Swedish (`sv`) | `,` (comma) | ` ` (space) | `kr` suffix |
| English (`en`) | `.` (dot) | `,` (comma) | `SEK` suffix |

Example: Swedish `1 281,25 kr` vs English `1,281.25 SEK`.

The `NumberInput` component handles locale-aware parsing: stores canonical dot-decimal in form state, displays in locale format to the user. The `fmtNum` / `fmtCurrency` helpers in the export renderers handle locale formatting.

---

## Soft delete

Specifications are never hard-deleted. Setting `deletedAt` on a spec removes it from all list queries (`WHERE deleted_at IS NULL`). No UI currently restores soft-deleted specs, but the data is retained. Admin can see and reassign specs only by user — they cannot view contents.

---

## Password reset flow

1. Admin generates a reset link via the admin UI.
2. The API creates a `password_reset_token` record storing `sha256(rawToken)`, a 24-hour expiry, and the target user ID.
3. The admin delivers the raw link out-of-band (no email service).
4. The user visits the link; the API hashes the incoming token, finds the matching record, updates the password, and marks `usedAt`. All in one transaction.
5. Tokens expire after 24 hours and work only once.

**No email integration.** This is intentional (see PRD). The admin sees the raw URL and copies it manually.

---

## Admin capabilities and limits

- Can view user list (email, name, role, created date)
- Can generate one-time password reset links
- Can promote/demote other users to/from admin
- **Cannot reduce admin count to zero** — the `setAdmin` mutation checks in a transaction and rejects the last admin demotion
- Can reassign spec ownership (by user, without seeing spec contents)
- **Cannot read spec contents** — `listByUser` returns only `id` and `name`

---

## i18n scope

Only UI chrome is translated (buttons, labels, error messages, column headers). User-entered content — spec names, item names, descriptions, responsible person — is **never translated**. It is stored and displayed exactly as typed, regardless of the active locale.

---

## How to contribute to this file

Add an entry when: you discover a business rule that isn't obvious from the code, a domain term has a specific meaning that differs from its everyday usage, or an agent producing technically correct code would still produce the wrong output without knowing this context. This file is especially important for VAT, money arithmetic, and the admin privilege model.
