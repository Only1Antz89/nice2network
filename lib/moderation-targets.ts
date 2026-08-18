import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { messages, projectUpdates, projects, timelinePosts, users } from "@/db/schema";

export const moderationTargetTypes = ["user", "project", "post", "message", "update"] as const;
export type ModerationTargetType = typeof moderationTargetTypes[number];

export async function getModerationTarget(targetType: ModerationTargetType, targetId: string): Promise<Record<string, unknown> | null> {
  const db = getDb();
  if (targetType === "user") {
    const [row] = await db.select({ id: users.id, username: users.username, name: users.name, image: users.image, profession: users.profession, headline: users.headline, bio: users.bio, ageBand: users.ageBand, status: users.status, createdAt: users.createdAt, updatedAt: users.updatedAt }).from(users).where(eq(users.id, targetId)).limit(1);
    return row ?? null;
  }
  if (targetType === "project") {
    const [row] = await db.select().from(projects).where(eq(projects.id, targetId)).limit(1);
    return row ? row as unknown as Record<string, unknown> : null;
  }
  if (targetType === "post") {
    const [row] = await db.select().from(timelinePosts).where(eq(timelinePosts.id, targetId)).limit(1);
    return row ? row as unknown as Record<string, unknown> : null;
  }
  if (targetType === "message") {
    const [row] = await db.select({ id: messages.id, conversationId: messages.conversationId, senderId: messages.senderId, body: messages.body, attachmentType: messages.attachmentType, attachmentUrl: messages.attachmentUrl, status: messages.status, createdAt: messages.createdAt, editedAt: messages.editedAt }).from(messages).where(eq(messages.id, targetId)).limit(1);
    return row ?? null;
  }
  const [row] = await db.select().from(projectUpdates).where(eq(projectUpdates.id, targetId)).limit(1);
  return row ? row as unknown as Record<string, unknown> : null;
}
