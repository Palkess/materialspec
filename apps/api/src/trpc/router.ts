import { router } from "./trpc.js";
import { authRouter } from "./auth.router.js";
import { specsRouter } from "./specs.router.js";
import { adminRouter } from "./admin.router.js";

export const appRouter = router({
  auth: authRouter,
  specs: specsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
