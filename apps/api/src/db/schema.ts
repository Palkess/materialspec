import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";

export const localeEnum = pgEnum("locale", ["sv", "en"]);

// ─── User ────────────────────────────────────────────────────
export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  locale: localeEnum("locale").notNull().default("sv"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Session (Lucia v3) ──────────────────────────────────────
export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// ─── Password Reset Token ────────────────────────────────────
export const passwordResetTokens = pgTable("password_reset_token", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  hashedToken: text("hashed_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

// ─── Specification ───────────────────────────────────────────
export const specifications = pgTable("specification", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  responsiblePerson: varchar("responsible_person", { length: 255 })
    .notNull()
    .default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ─── Item ────────────────────────────────────────────────────
export const items = pgTable("item", {
  id: uuid("id").primaryKey().defaultRandom(),
  specificationId: uuid("specification_id")
    .notNull()
    .references(() => specifications.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  unit: varchar("unit", { length: 10 }).notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  pricePerUnit: numeric("price_per_unit", { precision: 12, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).notNull(),
});
