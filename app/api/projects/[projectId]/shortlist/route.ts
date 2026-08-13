import { and, asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projectRecommendations, projectRoles, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { requireProjectOwner } from "@/lib/project-access";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params;
    await requireProjectOwner(member.id, projectId);
    const rows = await getDb().select({
      recommendationId: projectRecommendations.id, roleId: projectRoles.id, roleTitle: projectRoles.title, phase: projectRoles.phase,
      userId: users.id, name: users.name, image: users.image, profession: users.profession, primarySkill: users.primarySkill,
      score: projectRecommendations.score, tier: projectRecommendations.tier, reasons: projectRecommendations.reasons,
    }).from(projectRecommendations).innerJoin(projectRoles, eq(projectRoles.id, projectRecommendations.roleId)).innerJoin(users, eq(users.id, projectRecommendations.userId))
      .where(and(eq(projectRecommendations.projectId, projectId), eq(projectRecommendations.status, "active"))).orderBy(asc(projectRoles.createdAt), desc(projectRecommendations.score), asc(users.id));
    const perRole = new Map<string, typeof rows>();
    for (const row of rows) { const current = perRole.get(row.roleId) ?? []; if (current.length < 5) { current.push(row); perRole.set(row.roleId, current); } }
    return NextResponse.json({ roles: [...perRole.entries()].map(([roleId, candidates]) => ({ roleId, roleTitle: candidates[0]?.roleTitle, phase: candidates[0]?.phase, candidates })) });
  } catch (error) { return apiError(error); }
}
