import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { follows, projectMembers, projects } from "@/db/schema";
import { createNotifications } from "@/lib/notifications";

export const PROJECT_JOIN_ARTWORK_URL = "/brand/n2-project-join-celebration.png";
export const NETWORK_JOIN_ARTWORK_URL = "/brand/n2-platform-welcome-sign.png";

export async function notifyProjectJoinFollowers(input: {
  userId: string;
  userName: string | null | undefined;
  projectId: string;
  projectTitle: string;
  roleTitle: string;
}) {
  const db = getDb();
  const [[project], followers, teammates] = await Promise.all([
    db.select({ status: projects.status, visibility: projects.visibility }).from(projects).where(eq(projects.id, input.projectId)).limit(1),
    db.select({ userId: follows.followerId }).from(follows).where(eq(follows.followingId, input.userId)),
    db.select({ userId: projectMembers.userId }).from(projectMembers).where(eq(projectMembers.projectId, input.projectId)),
  ]);
  if (!project || project.status !== "active" || project.visibility !== "network") return 0;
  const teammateIds = new Set(teammates.map(row => row.userId));
  const recipientIds = [...new Set(followers.map(row => row.userId))]
    .filter(userId => userId !== input.userId && !teammateIds.has(userId));
  await createNotifications(recipientIds.map(userId => ({
    userId,
    actorId: input.userId,
    type: "following" as const,
    title: `${input.userName ?? "A member you follow"} joined ${input.projectTitle}`,
    body: `Joining as ${input.roleTitle}.`,
    entityType: "project_join",
    entityId: input.projectId,
    href: `/?view=projects&project=${input.projectId}`,
  })));
  return recipientIds.length;
}
