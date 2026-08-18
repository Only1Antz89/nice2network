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
        count: sql`case when ${securityRateLimits.resetAt} <= ${now} then 1 else ${securityRateLimits.count} + 1 end`,
        resetAt: sql`case when ${securityRateLimits.resetAt} <= ${now} then ${resetAt} else ${securityRateLimits.resetAt} end`,
        updatedAt: now,
      },
    })
    .returning({ count: securityRateLimits.count });
  if (bucket.count > limit) throw new RateLimitError("Too many attempts. Please wait and try again.");
}
