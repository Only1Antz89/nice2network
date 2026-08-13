import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projectRecommendations, projectRoles } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";

const schema = z.object({ projectId: z.uuid(), roleId: z.uuid().optional() });
export async function POST(request: Request) {
  try {
    const member = await requireMember(), input = schema.parse(await request.json());
    const conditions = [eq(projectRecommendations.userId, member.id), eq(projectRecommendations.projectId, input.projectId), eq(projectRecommendations.status, "active")];
    if (input.roleId) conditions.push(eq(projectRecommendations.roleId, input.roleId));
    const [match] = await getDb().select({ recommendationId: projectRecommendations.id, roleId: projectRecommendations.roleId, roleTitle: projectRoles.title, score: projectRecommendations.score, tier: projectRecommendations.tier, reasons: projectRecommendations.reasons })
      .from(projectRecommendations).innerJoin(projectRoles, eq(projectRoles.id, projectRecommendations.roleId)).where(and(...conditions)).orderBy(desc(projectRecommendations.score)).limit(1);
    if (!match) throw new ApiError(404, "No eligible recommendation exists for this project");
    return NextResponse.json(match);
  } catch (error) { return apiError(error); }
}
