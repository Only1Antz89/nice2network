import { and, asc, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projectRecommendations, projectRoles, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { requireProjectOwner } from "@/lib/project-access";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params;
    await requireProjectOwner(member.id, projectId);
    const db = getDb();
    const [openRoles, rows] = await Promise.all([
      db.select({
        roleId: projectRoles.id,
        roleTitle: projectRoles.title,
        phase: projectRoles.phase,
      }).from(projectRoles).where(and(
        eq(projectRoles.projectId, projectId),
        eq(projectRoles.status, "open"),
        sql`${projectRoles.filled} < ${projectRoles.capacity}`,
      )).orderBy(asc(projectRoles.createdAt)),
      db.select({
        recommendationId: projectRecommendations.id, roleId: projectRoles.id, roleTitle: projectRoles.title, phase: projectRoles.phase,
        userId: users.id, name: users.name, image: users.image, profession: users.profession, primarySkill: users.primarySkill,
        score: projectRecommendations.score, tier: projectRecommendations.tier, reasons: projectRecommendations.reasons,
      }).from(projectRecommendations).innerJoin(projectRoles, eq(projectRoles.id, projectRecommendations.roleId)).innerJoin(users, eq(users.id, projectRecommendations.userId))
        .where(and(
          eq(projectRecommendations.projectId, projectId),
          eq(projectRecommendations.status, "active"),
          eq(projectRoles.status, "open"),
          eq(users.status, "active"),
        )).orderBy(asc(projectRoles.createdAt), desc(projectRecommendations.score), asc(users.id)),
    ]);
    const perRole = new Map<string, typeof rows>();
    for (const row of rows) { const current = perRole.get(row.roleId) ?? []; if (current.length < 5) { current.push(row); perRole.set(row.roleId, current); } }
    return NextResponse.json({
      roles: openRoles.map((role) => ({
        ...role,
        candidates: perRole.get(role.roleId) ?? [],
      })),
    });
  } catch (error) { return apiError(error); }
}
