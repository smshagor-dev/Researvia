const appUrl = process.env.APP_URL || "http://localhost:3000";
const secret = process.env.WORKER_SECRET;
const workerId = process.env.WORKER_ID || `worker-${process.pid}`;

if (!secret) {
  console.error("WORKER_SECRET is required.");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (;;) {
  try {
    const response = await fetch(`${appUrl}/api/v1/internal/jobs/run`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "x-worker-id": workerId }
    });
    if (!response.ok) {
      console.error(`Worker tick failed: HTTP ${response.status}`);
      await sleep(10_000);
      continue;
    }
    const payload = await response.json();
    const processed = Number(payload?.data?.processed ?? 0);
    if (processed === 0) await sleep(5_000);
  } catch (error) {
    console.error("Worker tick failed:", error instanceof Error ? error.message : "unknown error");
    await sleep(10_000);
  }
}
