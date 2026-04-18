import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, adminProcedure } from "./trpc.js";
import { db } from "../db/index.js";
import { appSettings } from "../db/schema.js";

export const settingsAdminRouter = router({
  getAll: adminProcedure.query(async () => {
    const rows = await db.select().from(appSettings);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      signupEnabled: map["signupEnabled"] === true,
    };
  }),

  setSignupEnabled: adminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .insert(appSettings)
        .values({
          key: "signupEnabled",
          value: input.enabled,
          updatedBy: ctx.user.id,
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: {
            value: input.enabled,
            updatedAt: new Date(),
            updatedBy: ctx.user.id,
          },
        });
      return { signupEnabled: input.enabled };
    }),
});
