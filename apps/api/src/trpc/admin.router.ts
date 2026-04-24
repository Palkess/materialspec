import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { randomBytes, createHash } from "node:crypto";
import { eq, and, isNull, sql, inArray } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";
import { db } from "../db/index.js";
import { users, sessions, passwordResetTokens, specifications, appSettings } from "../db/schema.js";
import { settingsAdminRouter } from "./admin.settings.router.js";

export const adminRouter = router({
  settings: settingsAdminRouter,
  users: router({
    list: adminProcedure.query(async () => {
      return db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          isAdmin: users.isAdmin,
          locale: users.locale,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(users.createdAt);
    }),

    setAdmin: adminProcedure
      .input(
        z.object({
          userId: z.string().uuid(),
          isAdmin: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Last-admin guard inside a transaction
        return db.transaction(async (tx) => {
          if (!input.isAdmin) {
            // Demoting — check we won't leave zero admins
            const [{ count }] = await tx
              .select({ count: sql<number>`count(*)::int` })
              .from(users)
              .where(eq(users.isAdmin, true));

            if (count <= 1) {
              throw new Error("errors.admin.lastAdmin");
            }
          }

          await tx
            .update(users)
            .set({ isAdmin: input.isAdmin })
            .where(eq(users.id, input.userId));

          return { success: true };
        });
      }),

    delete: adminProcedure
      .input(z.object({ userIds: z.array(z.string().uuid()).min(1) }))
      .mutation(async ({ input, ctx }) => {
        if (input.userIds.includes(ctx.user.id)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "errors.admin.cannotDeleteSelf",
          });
        }

        return db.transaction(async (tx) => {
          const toDelete = await tx
            .select({ isAdmin: users.isAdmin })
            .from(users)
            .where(inArray(users.id, input.userIds));

          const deletingAdminCount = toDelete.filter((u) => u.isAdmin).length;
          if (deletingAdminCount > 0) {
            const [{ total }] = await tx
              .select({ total: sql<number>`count(*)::int` })
              .from(users)
              .where(eq(users.isAdmin, true));
            if (total - deletingAdminCount < 1) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "errors.admin.lastAdmin",
              });
            }
          }

          await tx.delete(sessions).where(inArray(sessions.userId, input.userIds));
          await tx.delete(passwordResetTokens).where(inArray(passwordResetTokens.userId, input.userIds));

          const userSpecs = await tx
            .select({ id: specifications.id })
            .from(specifications)
            .where(inArray(specifications.userId, input.userIds));

          if (userSpecs.length > 0) {
            await tx
              .delete(specifications)
              .where(inArray(specifications.id, userSpecs.map((s) => s.id)));
          }

          // Clear FK reference before deleting users; NULL values are unaffected by inArray
          await tx
            .update(appSettings)
            .set({ updatedBy: null })
            .where(inArray(appSettings.updatedBy, input.userIds));

          await tx.delete(users).where(inArray(users.id, input.userIds));

          return { count: input.userIds.length };
        });
      }),

    generateResetLink: adminProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .mutation(async ({ input }) => {
        const rawToken = randomBytes(32).toString("hex");
        const hashedToken = createHash("sha256")
          .update(rawToken)
          .digest("hex");

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        await db.insert(passwordResetTokens).values({
          userId: input.userId,
          hashedToken,
          expiresAt,
        });

        return { token: rawToken };
      }),
  }),

  specs: router({
    listByUser: adminProcedure
      .input(z.object({ userId: z.string().uuid() }))
      .query(async ({ input }) => {
        // Return only id and name — never contents
        return db
          .select({
            id: specifications.id,
            name: specifications.name,
          })
          .from(specifications)
          .where(
            and(
              eq(specifications.userId, input.userId),
              isNull(specifications.deletedAt)
            )
          )
          .orderBy(specifications.name);
      }),

    reassignOwner: adminProcedure
      .input(
        z.object({
          specIds: z.array(z.string().uuid()).min(1),
          newOwnerId: z.string().uuid(),
        })
      )
      .mutation(async ({ input }) => {
        // Validate target user exists before touching any specs
        const [targetUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, input.newOwnerId))
          .limit(1);

        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "errors.admin.targetUserNotFound",
          });
        }

        let count = 0;
        for (const specId of input.specIds) {
          await db
            .update(specifications)
            .set({ userId: input.newOwnerId })
            .where(and(eq(specifications.id, specId), isNull(specifications.deletedAt)));
          count++;
        }
        return { count };
      }),
  }),
});
