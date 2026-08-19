import "server-only";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { privacySettings, users } from "@/db/schema";

export function extractMentionUsernames(body: string) {
  return [...new Set([...body.matchAll(/(?:^|\s)@([a-z0-9_-]{2,30})\b/gi)].map((match) => match[1].toLowerCase()))];
}

export async function resolveMentionedUsers(body: string, options?: { excludeId?: string; allowedIds?: string[]; discoverableById?: string }) {
  const usernames = extractMentionUsernames(body);
  if (!usernames.length) return [];
  const db = getDb();
  if (!options?.discoverableById) {
    const rows = await db.select({ id: users.id, username: users.username }).from(users)
      .where(and(inArray(users.username, usernames), eq(users.status, "active")));
    return rows.filter((person) => person.id !== options?.excludeId && (!options?.allowedIds || options.allowedIds.includes(person.id)));
  }
  const [viewer] = await db.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, options.discoverableById)).limit(1);
  const discoverableAgeBands = viewer?.ageBand === "teen_16_17"
    ? ["teen_16_17"]
    : ["adult", "adult_18_24", "adult_25_plus"];
  const rows = await db.select({ id: users.id, username: users.username }).from(users)
    .leftJoin(privacySettings, eq(privacySettings.userId, users.id))
    .where(and(
      inArray(users.username, usernames),
      eq(users.status, "active"),
      inArray(users.ageBand, discoverableAgeBands),
      or(eq(privacySettings.profileVisibility, "network"), sql`${privacySettings.userId} is null`),
    ));
  return rows.filter((person) => person.id !== options?.excludeId && (!options?.allowedIds || options.allowedIds.includes(person.id)));
}
