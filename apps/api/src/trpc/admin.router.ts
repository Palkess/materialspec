import { z } from "zod";
import { randomBytes, createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";
import { db } from "../db/index.js";
import { users, passwordResetTokens } from "../db/schema.js";

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
});
