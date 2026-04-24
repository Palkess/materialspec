/**
 * Playwright global setup: verify the test stack is reachable.
 * Migrations run automatically on API boot (RUN_MIGRATIONS_ON_BOOT=true in
 * docker-compose.yml), so we poll both the API health endpoint and the web app
 * root before allowing tests to start.
 */
async function globalSetup() {
  const apiUrl = process.env.E2E_API_URL || process.env.PUBLIC_API_URL || "http://localhost:3721";
  const webUrl = process.env.E2E_BASE_URL || "http://localhost:4321";
  const maxAttempts = 30;
  const delayMs = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${apiUrl}/health`);
      if (res.ok) {
        console.log(`[globalSetup] API ready at ${apiUrl}`);
        break;
      }
    } catch {
      // not ready yet
    }
    console.log(`[globalSetup] Waiting for API... (${i + 1}/${maxAttempts})`);
    await new Promise((r) => setTimeout(r, delayMs));
    if (i === maxAttempts - 1) {
      throw new Error(`[globalSetup] API at ${apiUrl} did not become ready in time`);
    }
  }

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(webUrl);
      if (res.ok || res.status === 302 || res.status === 301) {
        console.log(`[globalSetup] Web app ready at ${webUrl}`);
        return;
      }
    } catch {
      // not ready yet
    }
    console.log(`[globalSetup] Waiting for web app... (${i + 1}/${maxAttempts})`);
    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw new Error(`[globalSetup] Web app at ${webUrl} did not become ready in time`);
}

export default globalSetup;
