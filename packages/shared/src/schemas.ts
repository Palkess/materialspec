import { z } from "zod";
import { UNITS, VAT_RATES } from "./constants.js";

// ─── User ────────────────────────────────────────────────────
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  locale: z.enum(["sv", "en"]).default("sv"),
  isAdmin: z.boolean().default(false),
  createdAt: z.date(),
});

// ─── Item ────────────────────────────────────────────────────
export const itemSchema = z.object({
  id: z.string().uuid(),
  specificationId: z.string().uuid(),
  sortOrder: z.number().int().min(0),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).default(""),
  unit: z.enum(UNITS),
  quantity: z.string().regex(/^\d+(\.\d{1,3})?$/, "Invalid quantity"),
  pricePerUnit: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price"),
  taxRate: z.string().refine(
    (v) => VAT_RATES.map(String).includes(v),
    "Invalid VAT rate"
  ),
});

// ─── Item input (for forms, no id/specificationId/sortOrder) ─
export const itemInputSchema = itemSchema.omit({
  id: true,
  specificationId: true,
  sortOrder: true,
});

// ─── Specification ───────────────────────────────────────────
export const specificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).default(""),
  responsiblePerson: z.string().max(255).default(""),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// ─── Create / Update schemas ─────────────────────────────────
export const specCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).default(""),
  responsiblePerson: z.string().max(255).default(""),
  items: z.array(itemInputSchema).default([]),
});

export const specUpdateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).default(""),
  responsiblePerson: z.string().max(255).default(""),
  items: z.array(itemInputSchema).default([]),
});

// ─── Inferred types ──────────────────────────────────────────
export type User = z.infer<typeof userSchema>;
export type Item = z.infer<typeof itemSchema>;
export type ItemInput = z.infer<typeof itemInputSchema>;
export type Specification = z.infer<typeof specificationSchema>;
export type SpecCreate = z.infer<typeof specCreateSchema>;
export type SpecUpdate = z.infer<typeof specUpdateSchema>;
