import "server-only";
import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { follows, projectFollows, projectFundingInterests, projectMembers, projects, timelinePosts } from "@/db/schema";
import { ApiError } from "@/lib/api";

async function areMutualConnections(firstUserId: string, secondUserId: string) {
  const directions = await getDb().select({ followerId: follows.followerId }).from(follows).where(or(
    and(eq(follows.followerId, firstUserId), eq(follows.followingId, secondUserId)),
    and(eq(follows.followerId, secondUserId), eq(follows.followingId, firstUserId)),
  ));
  return directions.some((row) => row.followerId === firstUserId) && directions.some((row) => row.followerId === secondUserId);
}

export async function requireProjectView(userId: string, projectId: string) {
  const db = getDb();
  const [project] = await db.select({ id: projects.id, ownerId: projects.ownerId, status: projects.status, visibility: projects.visibility }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.status === "deleted") throw new ApiError(404, "Project not found");
  if (project.ownerId === userId) return project;
  const [membership] = await db.select({ userId: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))).limit(1);
  if (membership) return project;
  if (project.status === "pending_deletion") {
    const [[following], [funding]] = await Promise.all([
      db.select({ userId: projectFollows.userId }).from(projectFollows).where(and(eq(projectFollows.projectId, projectId), eq(projectFollows.userId, userId))).limit(1),
      db.select({ userId: projectFundingInterests.userId }).from(projectFundingInterests).where(and(eq(projectFundingInterests.projectId, projectId), eq(projectFundingInterests.userId, userId))).limit(1),
    ]);
    if (following || funding) return project;
    throw new ApiError(404, "Project not found");
  }
  if (project.visibility === "network") return project;
  if (project.visibility === "connections" && await areMutualConnections(userId, project.ownerId)) return project;
  throw new ApiError(404, "Project not found");
}

export async function requirePostView(userId: string, postId: string) {
  const [post] = await getDb().select({ id: timelinePosts.id, authorId: timelinePosts.authorId, status: timelinePosts.status, visibility: timelinePosts.visibility }).from(timelinePosts).where(eq(timelinePosts.id, postId)).limit(1);
  if (!post || post.status !== "visible") throw new ApiError(404, "Post not found");
  if (post.authorId === userId || post.visibility === "network") return post;
  if (post.visibility === "connections" && await areMutualConnections(userId, post.authorId)) return post;
  throw new ApiError(404, "Post not found");
}
