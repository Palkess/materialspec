import { db } from "../db/index.js";
import { appSettings } from "../db/schema.js";

export async function seedAppSettings() {
  await db
    .insert(appSettings)
    .values({ key: "signupEnabled", value: true })
    .onConflictDoNothing();
  console.log("App settings seeded.");
}
