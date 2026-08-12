import "server-only";
import { createHash } from "node:crypto";
import { getDb, isDatabaseConfigured } from "@/db";
import { productEvents } from "@/db/schema";

const allowedProperties = new Set(["provider", "stage", "industry", "roleCount", "signal", "targetType", "reason", "priority", "projectStatus", "source", "result"]);

export async function trackProductEvent(input: { actorId?: string | null; ageBand?: string | null; event: string; entityType?: string; entityId?: string; properties?: Record<string, string | number | boolean | null | undefined> }) {
  if (!isDatabaseConfigured()) return;
  const properties = Object.fromEntries(Object.entries(input.properties ?? {}).filter(([key, value]) => allowedProperties.has(key) && value !== undefined)) as Record<string, string | number | boolean | null>;
  const actorHash = input.actorId ? createHash("sha256").update(`${process.env.AUTH_SECRET ?? "local"}:${input.actorId}`).digest("hex") : null;
  await getDb().insert(productEvents).values({ actorHash, ageBand: input.ageBand, event: input.event, entityType: input.entityType, entityId: input.entityId, properties });
}
