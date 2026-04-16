import { router } from "./trpc.js";
import { authRouter } from "./auth.router.js";
import { specsRouter } from "./specs.router.js";

export const appRouter = router({
  auth: authRouter,
  specs: specsRouter,
});

export type AppRouter = typeof appRouter;
