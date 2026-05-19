// Simple in-memory rate limiter. Provides protection in dev and self-hosted
// deployments. On serverless platforms (Vercel) each function instance has its
// own memory, so this is best-effort — a Redis-backed solution is needed for
// strict per-IP enforcement across instances.

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(key, entry);
  }

  entry.count++;
  const remaining = Math.max(0, MAX_ATTEMPTS - entry.count);
  return { allowed: entry.count <= MAX_ATTEMPTS, remaining, resetAt: entry.resetAt };
}

export function clearRateLimit(key: string) {
  store.delete(key);
}
