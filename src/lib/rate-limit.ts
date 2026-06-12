// Simple in-memory per-IP rate limiter. Sufficient for a single-instance,
// low-volume deployment; swap for Upstash/Redis if you scale horizontally.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5; // submissions per IP per hour (each triggers paid LLM work)

export function rateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const existing = buckets.get(ip);

  if (!existing || now > existing.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (existing.count >= MAX_PER_WINDOW) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
