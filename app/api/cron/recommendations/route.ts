import { and, asc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projectBlueprints, projects, recommendationJobs } from "@/db/schema";
import { generateProjectBlueprint, processEmbeddingReindex, recomputeProjectRecommendations } from "@/lib/recommendations/service";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const [job] = await db.select().from(recommendationJobs).where(and(eq(recommendationJobs.type, "embedding_reindex"), eq(recommendationJobs.status, "running"))).orderBy(asc(recommendationJobs.createdAt)).limit(1);
  const [queuedJob] = job ? [] : await db.select().from(recommendationJobs).where(and(eq(recommendationJobs.type, "embedding_reindex"), eq(recommendationJobs.status, "queued"))).orderBy(asc(recommendationJobs.createdAt)).limit(1);
  let reindex = null;
  try { if (job || queuedJob) reindex = await processEmbeddingReindex((job ?? queuedJob).id, 20); } catch (error) {
    const target = job ?? queuedJob;
    if (target) await db.update(recommendationJobs).set({ status: "failed", error: error instanceof Error ? error.message.slice(0, 500) : "Reindex failed", completedAt: new Date() }).where(eq(recommendationJobs.id, target.id));
  }
  const missingBlueprints = await db.select({ id: projects.id, ownerId: projects.ownerId }).from(projects).leftJoin(projectBlueprints, eq(projectBlueprints.projectId, projects.id)).where(and(eq(projects.status, "active"), isNull(projectBlueprints.id))).orderBy(asc(projects.createdAt)).limit(3);
  let blueprints = 0;
  for (const project of missingBlueprints) { try { await generateProjectBlueprint(project.id, project.ownerId); blueprints++; } catch { /* The next daily batch can safely retry. */ } }
  const active = await db.select({ id: projects.id }).from(projects).where(eq(projects.status, "active")).orderBy(asc(projects.updatedAt)).limit(10);
  let recommendations = 0;
  for (const project of active) { try { recommendations += (await recomputeProjectRecommendations(project.id)).generated; } catch { /* One malformed legacy project must not stop the batch. */ } }
  return NextResponse.json({ blueprints, recommendations, reindex });
}
