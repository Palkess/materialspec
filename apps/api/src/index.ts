import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/context.js";
import { runMigrations } from "./db/migrate.js";
import { seedAdmin } from "./auth/seed.js";
import { renderXlsx } from "./export/xlsx.js";
import { renderPdf } from "./export/pdf.js";
import { lucia } from "./auth/lucia.js";
import { db } from "./db/index.js";
import { specifications, items } from "./db/schema.js";
import { eq, and, isNull } from "drizzle-orm";

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

// Export routes (plain GET, not tRPC)
// Two explicit routes instead of /export.:ext — Hono 4 dot-param matching is unreliable.
async function handleExport(c: Parameters<Parameters<typeof app.get>[1]>[0], ext: "xlsx" | "pdf") {
  const { id } = c.req.param();

  const cookieHeader = c.req.header("Cookie") ?? "";
  const sessionId = lucia.readSessionCookie(cookieHeader);
  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);

  const { session, user } = await lucia.validateSession(sessionId);
  if (!session || !user) return c.json({ error: "Unauthorized" }, 401);

  const [spec] = await db
    .select()
    .from(specifications)
    .where(
      and(
        eq(specifications.id, id),
        eq(specifications.userId, user.id),
        isNull(specifications.deletedAt)
      )
    )
    .limit(1);

  if (!spec) return c.json({ error: "Not found" }, 403);

  const specItems = await db
    .select()
    .from(items)
    .where(eq(items.specificationId, id))
    .orderBy(items.sortOrder);

  const queryLang = c.req.query("lang");
  const lang: "sv" | "en" =
    queryLang === "sv" || queryLang === "en"
      ? queryLang
      : ((user.locale as "sv" | "en") || "sv");

  const safeName = spec.name.replace(/[^a-zA-Z0-9åäöÅÄÖ\- ]/g, "");

  if (ext === "xlsx") {
    const buffer = await renderXlsx(spec, specItems, lang);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeName}.xlsx"`,
      },
    });
  } else {
    const buffer = await renderPdf(spec, specItems, lang);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  }
}

app.get("/specs/:id/export.xlsx", (c) => handleExport(c, "xlsx"));
app.get("/specs/:id/export.pdf", (c) => handleExport(c, "pdf"));

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
