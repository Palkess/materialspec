import { hash } from "@node-rs/argon2";

const API_URL = process.env.E2E_API_URL || "http://localhost:3721";

const argon2Options = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/**
 * Create a test user directly via the signup API and return the session cookie.
 * For faster tests, this avoids clicking through the signup form.
 */
export async function createTestUser(opts?: {
  email?: string;
  name?: string;
  password?: string;
  isAdmin?: boolean;
}): Promise<{ cookie: string; userId: string }> {
  const email = opts?.email || `test-${Date.now()}@example.com`;
  const name = opts?.name || "Test User";
  const password = opts?.password || "password123";

  // Signup via tRPC
  const response = await fetch(`${API_URL}/trpc/auth.signup?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { email, name, password } }),
  });

  const setCookieHeader = response.headers.get("set-cookie") || "";
  const data = await response.json();
  const userId = data[0]?.result?.data?.id;

  return {
    cookie: setCookieHeader,
    userId,
  };
}

/**
 * Login and return the session cookie value.
 */
export async function loginUser(
  email: string,
  password: string
): Promise<string> {
  const response = await fetch(`${API_URL}/trpc/auth.login?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "0": { email, password } }),
  });

  return response.headers.get("set-cookie") || "";
}

/**
 * Delete test users by email after a test run.
 * Logs in as the seeded admin, resolves emails to IDs, then deletes them.
 * Skips gracefully if users no longer exist.
 */
export async function deleteTestUsers(emails: string[]): Promise<void> {
  if (emails.length === 0) return;

  const adminEmail =
    process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@materialspec.test";
  const adminPassword =
    process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_INITIAL_PASSWORD || "adminpassword";

  const adminCookie = await loginUser(adminEmail, adminPassword);

  const listInput = encodeURIComponent(JSON.stringify({ "0": {} }));
  const listRes = await fetch(
    `${API_URL}/trpc/admin.users.list?batch=1&input=${listInput}`,
    { headers: { Cookie: adminCookie } }
  );
  const listData = (await listRes.json()) as Array<{
    result: { data: Array<{ id: string; email: string }> };
  }>;
  const allUsers = listData[0]?.result?.data ?? [];

  const targetIds = allUsers
    .filter((u) => emails.includes(u.email))
    .map((u) => u.id);

  if (targetIds.length === 0) return;

  await fetch(`${API_URL}/trpc/admin.users.delete?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ "0": { userIds: targetIds } }),
  });
}
