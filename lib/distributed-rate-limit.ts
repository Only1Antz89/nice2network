import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { securityRateLimits } from "@/db/schema";
import { RateLimitError } from "@/lib/rate-limit";

export async function enforceDistributedRateLimit(key: string, limit: number, windowMs: number) {
  const keyHash = createHash("sha256").update(`${process.env.AUTH_SECRET ?? "local"}:${key}`).digest("hex");
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const [bucket] = await getDb().insert(securityRateLimits).values({ keyHash, count: 1, resetAt })
    .onConflictDoUpdate({
      target: securityRateLimits.keyHash,
      set: {
        // Date values interpolated directly into raw SQL do not inherit the
        // timestamp column encoder. postgres-js therefore receives a Date
        // object and rejects the whole sign-in query with ERR_INVALID_ARG_TYPE.
        // Keep clock comparisons inside PostgreSQL and bind only the numeric
        // window, whose type is unambiguous.
        count: sql`case when ${securityRateLimits.resetAt} <= now() then 1 else ${securityRateLimits.count} + 1 end`,
        resetAt: sql`case when ${securityRateLimits.resetAt} <= now() then now() + (${windowMs} * interval '1 millisecond') else ${securityRateLimits.resetAt} end`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ count: securityRateLimits.count });
  if (bucket.count > limit) throw new RateLimitError("Too many attempts. Please wait and try again.");
}
