import "server-only";
import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { projectMembers, projects } from "@/db/schema";
import { ApiError } from "@/lib/api";

export async function requireProjectOwner(userId: string, projectId: string) {
  const [row] = await getDb().select({ project: projects }).from(projects)
    .leftJoin(projectMembers, and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, userId)))
    .where(and(eq(projects.id, projectId), or(eq(projects.ownerId, userId), eq(projectMembers.membershipRole, "co_owner")))).limit(1);
  if (!row) throw new ApiError(403, "Only a project owner can do that");
  return row.project;
}

export function assertProjectMutable<T extends { status: string }>(project: T): T {
  if (project.status === "pending_deletion") throw new ApiError(409, "This project is pending deletion and is read-only");
  if (project.status === "deleted") throw new ApiError(404, "Project not found");
  return project;
}

export async function requireMutableProjectOwner(userId: string, projectId: string) {
  return assertProjectMutable(await requireProjectOwner(userId, projectId));
}
