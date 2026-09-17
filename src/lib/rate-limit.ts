import 'server-only';

type Bucket = { count: number; resetAt: number };
const memory = new Map<string, Bucket>();

/**
 * Fixed-window limiter. Uses Upstash Redis when configured (required for
 * serverless, where every instance has its own memory) and falls back to an
 * in-process Map for local development.
 */
export async function rateLimit(
  key: string,
  { limit, windowSec }: { limit: number; windowSec: number },
): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(windowSec), 'NX'],
      ]),
      cache: 'no-store',
    });
    if (!res.ok) return true; // fail open — never block bookings on limiter downtime
    const [incr] = (await res.json()) as Array<{ result: number }>;
    return incr.result <= limit;
  }

  const now = Date.now();
  const bucket = memory.get(key);
  if (!bucket || bucket.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
