import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { runMigrations } from "./db/migrate.js";

const app = new Hono();

app.use("/*", cors());

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

const port = Number(process.env.API_PORT) || 3001;
const host = process.env.API_HOST || "0.0.0.0";

async function main() {
  if (process.env.RUN_MIGRATIONS_ON_BOOT === "true") {
    await runMigrations();
  }

  console.log(`API server starting on ${host}:${port}`);
  serve({ fetch: app.fetch, port, hostname: host });
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
