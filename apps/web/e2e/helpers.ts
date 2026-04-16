import { hash } from "@node-rs/argon2";

const API_URL = process.env.E2E_API_URL || "http://localhost:3002";

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
