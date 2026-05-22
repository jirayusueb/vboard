/** Wait for the API server (port 3000) to be accepting connections. */
export async function waitForApiServer(timeout = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch("http://localhost:3000/api/auth/get-session", {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok || res.status === 401) return;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`API server not ready after ${timeout}ms`);
}
