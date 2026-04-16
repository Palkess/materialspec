import { z } from "zod";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { router, protectedProcedure } from "./trpc.js";
import { db } from "../db/index.js";
import { specifications, items } from "../db/schema.js";
import { specCreateSchema, specUpdateSchema } from "@materialspec/shared";

export const specsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const specs = await db
      .select({
        id: specifications.id,
        name: specifications.name,
        responsiblePerson: specifications.responsiblePerson,
        createdAt: specifications.createdAt,
        updatedAt: specifications.updatedAt,
        itemCount: sql<number>`(SELECT COUNT(*) FROM item WHERE item.specification_id = ${specifications.id})::int`,
        grandTotal: sql<string>`COALESCE((SELECT SUM(quantity * price_per_unit * (1 + tax_rate)) FROM item WHERE item.specification_id = ${specifications.id}), 0)::text`,
      })
      .from(specifications)
      .where(
        and(
          eq(specifications.userId, ctx.user.id),
          isNull(specifications.deletedAt)
        )
      )
      .orderBy(desc(specifications.updatedAt));

    return specs;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [spec] = await db
        .select()
        .from(specifications)
        .where(
          and(
            eq(specifications.id, input.id),
            eq(specifications.userId, ctx.user.id),
            isNull(specifications.deletedAt)
          )
        )
        .limit(1);

      if (!spec) {
        throw new Error("errors.spec.notFound");
      }

      const specItems = await db
        .select()
        .from(items)
        .where(eq(items.specificationId, input.id))
        .orderBy(items.sortOrder);

      return { ...spec, items: specItems };
    }),

  create: protectedProcedure
    .input(specCreateSchema)
    .mutation(async ({ input, ctx }) => {
      const [spec] = await db
        .insert(specifications)
        .values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          responsiblePerson: input.responsiblePerson,
        })
        .returning();

      if (input.items.length > 0) {
        await db.insert(items).values(
          input.items.map((item, i) => ({
            specificationId: spec.id,
            sortOrder: i,
            name: item.name,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            taxRate: item.taxRate,
          }))
        );
      }

      return { id: spec.id };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(specUpdateSchema))
    .mutation(async ({ input, ctx }) => {
      const [spec] = await db
        .select()
        .from(specifications)
        .where(
          and(
            eq(specifications.id, input.id),
            eq(specifications.userId, ctx.user.id),
            isNull(specifications.deletedAt)
          )
        )
        .limit(1);

      if (!spec) {
        throw new Error("errors.spec.notFound");
      }

      await db.transaction(async (tx) => {
        await tx
          .update(specifications)
          .set({
            name: input.name,
            description: input.description,
            responsiblePerson: input.responsiblePerson,
            updatedAt: new Date(),
          })
          .where(eq(specifications.id, input.id));

        // Delete all existing items and re-insert
        await tx.delete(items).where(eq(items.specificationId, input.id));

        if (input.items.length > 0) {
          await tx.insert(items).values(
            input.items.map((item, i) => ({
              specificationId: input.id,
              sortOrder: i,
              name: item.name,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              pricePerUnit: item.pricePerUnit,
              taxRate: item.taxRate,
            }))
          );
        }
      });

      return { id: input.id };
    }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [spec] = await db
        .select()
        .from(specifications)
        .where(
          and(
            eq(specifications.id, input.id),
            eq(specifications.userId, ctx.user.id),
            isNull(specifications.deletedAt)
          )
        )
        .limit(1);

      if (!spec) {
        throw new Error("errors.spec.notFound");
      }

      await db
        .update(specifications)
        .set({ deletedAt: new Date() })
        .where(eq(specifications.id, input.id));

      return { success: true };
    }),

  duplicate: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        locale: z.enum(["sv", "en"]).default("sv"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [spec] = await db
        .select()
        .from(specifications)
        .where(
          and(
            eq(specifications.id, input.id),
            eq(specifications.userId, ctx.user.id),
            isNull(specifications.deletedAt)
          )
        )
        .limit(1);

      if (!spec) {
        throw new Error("errors.spec.notFound");
      }

      const suffix = input.locale === "sv" ? " (kopia)" : " (copy)";

      const [newSpec] = await db
        .insert(specifications)
        .values({
          userId: ctx.user.id,
          name: spec.name + suffix,
          description: spec.description,
          responsiblePerson: spec.responsiblePerson,
        })
        .returning();

      const sourceItems = await db
        .select()
        .from(items)
        .where(eq(items.specificationId, input.id))
        .orderBy(items.sortOrder);

      if (sourceItems.length > 0) {
        await db.insert(items).values(
          sourceItems.map((item, i) => ({
            specificationId: newSpec.id,
            sortOrder: i,
            name: item.name,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            taxRate: item.taxRate,
          }))
        );
      }

      return { id: newSpec.id };
    }),
});
