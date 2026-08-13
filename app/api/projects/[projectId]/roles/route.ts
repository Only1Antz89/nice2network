import { and, eq } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projectRoles, projects } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { recomputeProjectRecommendations } from "@/lib/recommendations/service";

const schema = z.object({ title: z.string().trim().min(2).max(100), department: z.string().trim().min(2).max(80), description: z.string().trim().max(500).optional(), professions: z.array(z.string().max(80)).max(8).default([]), requiredSkills: z.array(z.string().max(80)).min(1).max(12), usefulSkills: z.array(z.string().max(80)).max(12).default([]), phase: z.enum(["now", "next", "later"]).default("now"), criticality: z.enum(["critical", "important", "useful"]).default("important"), workMode: z.enum(["remote", "hybrid", "in_person"]).optional(), capacity: z.number().int().min(1).max(10).default(1) });
export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params, input = schema.parse(await request.json()), db = getDb();
    const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, member.id))).limit(1);
    if (!project) throw new ApiError(403, "Only a project owner can add roles");
    const [role] = await db.insert(projectRoles).values({ ...input, projectId, skills: [...new Set([...input.requiredSkills, ...input.usefulSkills])], reason: input.description }).returning();
    after(() => recomputeProjectRecommendations(projectId));
    await audit(member.id, "project.role_created", "project", projectId, { roleId: role.id });
    return NextResponse.json(role, { status: 201 });
  } catch (error) { return apiError(error); }
}
