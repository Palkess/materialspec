import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!email || !password) {
    console.log("ADMIN_EMAIL or ADMIN_INITIAL_PASSWORD not set, skipping admin seed.");
    return;
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing.length > 0) {
    console.log(`Admin user ${email} already exists, skipping seed.`);
    return;
  }

  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  await db.insert(users).values({
    email,
    name: "Admin",
    passwordHash,
    isAdmin: true,
    locale: "sv",
  });

  console.log(`Admin user ${email} seeded successfully.`);
}
