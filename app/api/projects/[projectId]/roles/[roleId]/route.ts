import { after, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { projectRoles } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireMutableProjectOwner as requireProjectOwner } from "@/lib/project-access";
import { recomputeProjectRecommendations } from "@/lib/recommendations/service";

const schema = z.object({
  title: z.string().trim().min(2).max(100),
  department: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  professions: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
  requiredSkills: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  usefulSkills: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  phase: z.enum(["now", "next", "later"]),
  criticality: z.enum(["critical", "important", "useful"]),
  workMode: z.enum(["remote", "hybrid", "in_person"]).nullable().optional(),
  capacity: z.number().int().min(1).max(10),
});

async function roleForProject(projectId: string, roleId: string) {
  const [role] = await getDb().select().from(projectRoles).where(and(eq(projectRoles.id, roleId), eq(projectRoles.projectId, projectId))).limit(1);
  if (!role) throw new ApiError(404, "Role not found");
  return role;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string; roleId: string }> }) {
  try {
    const member = await requireMember(), { projectId, roleId } = await params, input = schema.parse(await request.json());
    await requireProjectOwner(member.id, projectId);
    const before = await roleForProject(projectId, roleId);
    if (input.capacity < before.filled) throw new ApiError(400, `Capacity cannot be lower than the ${before.filled} people already in this role`);
    const [role] = await getDb().update(projectRoles).set({
      ...input,
      workMode: input.workMode ?? undefined,
      skills: [...new Set([...input.requiredSkills, ...input.usefulSkills])],
      reason: input.description,
    }).where(and(eq(projectRoles.id, roleId), eq(projectRoles.projectId, projectId))).returning();
    after(() => recomputeProjectRecommendations(projectId));
    await audit(member.id, "project.role_updated", "project", projectId, { roleId }, { before, after: role });
    return NextResponse.json({ role });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ projectId: string; roleId: string }> }) {
  try {
    const member = await requireMember(), { projectId, roleId } = await params;
    await requireProjectOwner(member.id, projectId);
    const before = await roleForProject(projectId, roleId);
    const [role] = await getDb().update(projectRoles).set({ status: "removed" }).where(and(eq(projectRoles.id, roleId), eq(projectRoles.projectId, projectId))).returning();
    after(() => recomputeProjectRecommendations(projectId));
    await audit(member.id, "project.role_removed", "project", projectId, { roleId }, { before, after: role });
    return NextResponse.json({ role });
  } catch (error) { return apiError(error); }
}
