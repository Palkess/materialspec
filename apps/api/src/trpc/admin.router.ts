import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import { eq, and, isNull, sql } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";
import { db } from "../db/index.js";
import { users, passwordResetTokens, specifications } from "../db/schema.js";

export const adminRouter = router({
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
        let count = 0;
        for (const specId of input.specIds) {
          const result = await db
            .update(specifications)
            .set({ userId: input.newOwnerId })
            .where(eq(specifications.id, specId));
          count++;
        }
        return { count };
      }),
  }),
});
