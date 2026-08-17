import "server-only";
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function requestIp(request: Request) {
  return (request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for") ?? "unknown")
    .split(",", 1)[0].trim().slice(0, 80) || "unknown";
}

export class RateLimitError extends Error {
  status = 429 as const;
}

export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [candidate, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(candidate);
      if (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value as string);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) throw new RateLimitError("Too many attempts. Please wait and try again.");
}
