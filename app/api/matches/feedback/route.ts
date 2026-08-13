import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { matchFeedback, memberAffinities, projectRecommendations, projectRoles, projects, recommendationEvents, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";
import { canonicalTerm, recommendationSignalWeight } from "@/lib/recommendations/scoring";

const schema = z.object({ recommendationId: z.uuid(), signal: z.enum(["eye", "star", "comment", "application", "accepted_role", "joined", "completed", "dismiss", "not_relevant", "not_now"]), reason: z.string().trim().max(500).optional() });
export async function POST(request: Request) {
  try {
    const member = await requireMember(), input = schema.parse(await request.json()), db = getDb();
    const [row] = await db.select({ recommendation: projectRecommendations, role: projectRoles, project: projects, ageBand: users.ageBand }).from(projectRecommendations)
      .innerJoin(projectRoles, eq(projectRoles.id, projectRecommendations.roleId)).innerJoin(projects, eq(projects.id, projectRecommendations.projectId)).innerJoin(users, eq(users.id, projectRecommendations.userId))
      .where(and(eq(projectRecommendations.id, input.recommendationId), eq(projectRecommendations.userId, member.id))).limit(1);
    if (!row) throw new ApiError(404, "Recommendation not found");
    const weight = recommendationSignalWeight(input.signal);
    const feedback = await db.transaction(async tx => {
      const [created] = await tx.insert(matchFeedback).values({ userId: member.id, projectId: row.project.id, matchKey: row.recommendation.id, signal: input.signal, reason: input.reason, scoreSnapshot: row.recommendation.score, features: row.recommendation.componentScores }).returning({ id: matchFeedback.id });
      await tx.insert(recommendationEvents).values({ recommendationId: row.recommendation.id, userId: member.id, event: input.signal, signalWeight: Math.round(weight * 10), metadata: { source: "explicit_feedback" } });
      if (input.signal === "dismiss" || input.signal === "not_relevant") await tx.update(projectRecommendations).set({ status: "dismissed" }).where(eq(projectRecommendations.id, row.recommendation.id));
      if (input.signal === "not_now") await tx.update(projectRecommendations).set({ status: "snoozed", snoozedUntil: new Date(Date.now() + 14 * 86_400_000) }).where(eq(projectRecommendations.id, row.recommendation.id));
      if (row.ageBand !== "teen_16_17" && weight !== 0) {
        const dimensions = [["industry", row.project.industry], ["department", row.role.department], ...row.role.requiredSkills.map(skill => ["skill", skill])] as Array<[string, string]>;
        for (const [dimensionType, rawKey] of dimensions) {
          const dimensionKey = canonicalTerm(rawKey);
          await tx.insert(memberAffinities).values({ userId: member.id, dimensionType, dimensionKey, score: Math.round(weight * 2), evidenceCount: 1 }).onConflictDoUpdate({ target: [memberAffinities.userId, memberAffinities.dimensionType, memberAffinities.dimensionKey], set: { score: sql`greatest(-40, least(40, ${memberAffinities.score} + ${Math.round(weight * 2)}))`, evidenceCount: sql`${memberAffinities.evidenceCount} + 1`, updatedAt: new Date() } });
        }
      }
      return created;
    });
    await trackProductEvent({ actorId: member.id, ageBand: row.ageBand, event: "match_feedback", entityType: "recommendation", entityId: row.recommendation.id, properties: { signal: input.signal } });
    return NextResponse.json(feedback, { status: 201 });
  } catch (error) { return apiError(error); }
}
