/**
 * Playwright global setup: verify the test stack is reachable.
 * Migrations run automatically on API boot (RUN_MIGRATIONS_ON_BOOT=true in
 * docker-compose.yml), so we just poll until the API health endpoint responds.
 */
async function globalSetup() {
  const apiUrl = process.env.E2E_API_URL || process.env.PUBLIC_API_URL || "http://localhost:3001";
  const maxAttempts = 30;
  const delayMs = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${apiUrl}/health`);
      if (res.ok) {
        console.log(`[globalSetup] API ready at ${apiUrl}`);
        return;
      }
    } catch {
      // not ready yet
    }
    console.log(`[globalSetup] Waiting for API... (${i + 1}/${maxAttempts})`);
    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw new Error(`[globalSetup] API at ${apiUrl} did not become ready in time`);
}

export default globalSetup;
