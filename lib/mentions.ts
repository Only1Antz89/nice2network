import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

export function extractMentionUsernames(body: string) {
  return [...new Set([...body.matchAll(/(?:^|\s)@([a-z0-9_-]{2,30})\b/gi)].map((match) => match[1].toLowerCase()))];
}

export async function resolveMentionedUsers(body: string, options?: { excludeId?: string; allowedIds?: string[] }) {
  const usernames = extractMentionUsernames(body);
  if (!usernames.length) return [];
  const rows = await getDb().select({ id: users.id, username: users.username }).from(users)
    .where(and(inArray(users.username, usernames), eq(users.status, "active")));
  return rows.filter((person) => person.id !== options?.excludeId && (!options?.allowedIds || options.allowedIds.includes(person.id)));
}
