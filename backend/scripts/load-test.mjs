const concurrency = Number(process.argv[2] || 100);
const baseUrl = process.env.LOAD_TEST_URL || 'http://localhost:3001/health';
const requestsPerUser = Number(process.env.LOAD_TEST_REQUESTS_PER_USER || 5);

const samples = [];
let errors = 0;

async function hit() {
  const startedAt = performance.now();
  try {
    const response = await fetch(baseUrl);
    if (!response.ok) {
      errors += 1;
    }
  } catch {
    errors += 1;
  } finally {
    samples.push(performance.now() - startedAt);
  }
}

await Promise.all(
  Array.from({ length: concurrency }, async () => {
    for (let index = 0; index < requestsPerUser; index += 1) {
      await hit();
    }
  }),
);

samples.sort((a, b) => a - b);
const count = samples.length;
const average = samples.reduce((sum, value) => sum + value, 0) / Math.max(count, 1);
const percentile = (p) => samples[Math.min(Math.floor(count * p), Math.max(count - 1, 0))] || 0;

console.log(JSON.stringify({
  target: baseUrl,
  concurrency,
  requests: count,
  averageLatencyMs: Number(average.toFixed(2)),
  p95LatencyMs: Number(percentile(0.95).toFixed(2)),
  p99LatencyMs: Number(percentile(0.99).toFixed(2)),
  errorRate: Number((errors / Math.max(count, 1)).toFixed(4)),
}, null, 2));
