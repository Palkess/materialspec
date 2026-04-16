import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/context.js";
import { runMigrations } from "./db/migrate.js";
import { seedAdmin } from "./auth/seed.js";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: (origin) => origin,
    credentials: true,
  })
);

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.all("/trpc/*", async (c) => {
  const response = await fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext(c),
  });
  return response;
});

const port = Number(process.env.API_PORT) || 3001;
const host = process.env.API_HOST || "0.0.0.0";

async function main() {
  if (process.env.RUN_MIGRATIONS_ON_BOOT === "true") {
    await runMigrations();
  }

  await seedAdmin();

  console.log(`API server starting on ${host}:${port}`);
  serve({ fetch: app.fetch, port, hostname: host });
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
