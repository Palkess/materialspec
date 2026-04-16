import { z } from "zod";
import { createHash } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { eq, and, isNull, gt } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "./trpc.js";
import { lucia } from "../auth/lucia.js";
import { db } from "../db/index.js";
import { users, passwordResetTokens } from "../db/schema.js";

const argon2Options = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export const authRouter = router({
  signup: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).max(255),
        password: z.string().min(8).max(128),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        throw new Error("errors.auth.emailTaken");
      }

      const passwordHash = await hash(input.password, argon2Options);

      const [user] = await db
        .insert(users)
        .values({
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash,
        })
        .returning();

      const session = await lucia.createSession(user.id, {});
      const cookie = lucia.createSessionCookie(session.id);
      ctx.setCookie(cookie.name, cookie.value, cookie.attributes);

      return { id: user.id };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);

      if (!user) {
        throw new Error("errors.auth.invalidCredentials");
      }

      const valid = await verify(user.passwordHash, input.password, argon2Options);
      if (!valid) {
        throw new Error("errors.auth.invalidCredentials");
      }

      const session = await lucia.createSession(user.id, {});
      const cookie = lucia.createSessionCookie(session.id);
      ctx.setCookie(cookie.name, cookie.value, cookie.attributes);

      return { id: user.id };
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await lucia.invalidateSession(ctx.session.id);
    const cookie = lucia.createBlankSessionCookie();
    ctx.setCookie(cookie.name, cookie.value, cookie.attributes);
    return { success: true };
  }),

  me: protectedProcedure.query(({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      locale: ctx.user.locale,
      isAdmin: ctx.user.isAdmin,
    };
  }),

  changeLocale: protectedProcedure
    .input(z.object({ locale: z.enum(["sv", "en"]) }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(users)
        .set({ locale: input.locale })
        .where(eq(users.id, ctx.user.id));
      return { locale: input.locale };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user) {
        throw new Error("errors.auth.unauthorized");
      }

      const valid = await verify(
        user.passwordHash,
        input.currentPassword,
        argon2Options
      );
      if (!valid) {
        throw new Error("errors.auth.invalidCredentials");
      }

      const newHash = await hash(input.newPassword, argon2Options);
      await db
        .update(users)
        .set({ passwordHash: newHash })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  consumeResetToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      })
    )
    .mutation(async ({ input }) => {
      const hashedToken = createHash("sha256")
        .update(input.token)
        .digest("hex");

      return db.transaction(async (tx) => {
        const [tokenRecord] = await tx
          .select()
          .from(passwordResetTokens)
          .where(
            and(
              eq(passwordResetTokens.hashedToken, hashedToken),
              isNull(passwordResetTokens.usedAt),
              gt(passwordResetTokens.expiresAt, new Date())
            )
          )
          .limit(1);

        if (!tokenRecord) {
          throw new Error("errors.auth.invalidResetToken");
        }

        const newHash = await hash(input.newPassword, argon2Options);

        await tx
          .update(users)
          .set({ passwordHash: newHash })
          .where(eq(users.id, tokenRecord.userId));

        await tx
          .update(passwordResetTokens)
          .set({ usedAt: new Date() })
          .where(eq(passwordResetTokens.id, tokenRecord.id));

        return { success: true };
      });
    }),
});
