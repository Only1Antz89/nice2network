import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { algorithmSettings } from "@/db/schema";
import { apiError } from "@/lib/api";
import { requirePermission } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { createEmbeddingReindexJob, DEFAULT_ALGORITHM_WEIGHTS, getActiveAlgorithmSettings } from "@/lib/recommendations/service";

const weightsSchema = z.object({
  requiredSkills: z.number().min(0).max(100), profession: z.number().min(0).max(100), career: z.number().min(0).max(100), compatibility: z.number().min(0).max(100),
  availability: z.number().min(0).max(100), relevance: z.number().min(0).max(100), learned: z.number().min(0).max(100), warmPath: z.number().min(0).max(100),
  feedRoleMatch: z.number().min(0).max(100), feedUrgency: z.number().min(0).max(100), feedRelevance: z.number().min(0).max(100), feedEyes: z.number().min(0).max(100),
  feedFreshness: z.number().min(0).max(100), feedNetwork: z.number().min(0).max(100), feedExploration: z.number().min(0).max(100),
});
const schema = z.object({ provider: z.enum(["openai", "gemini"]), blueprintModel: z.string().trim().min(2).max(100), embeddingModel: z.string().trim().min(2).max(100), rolloutStage: z.number().int().min(1).max(3), weights: weightsSchema.default(DEFAULT_ALGORITHM_WEIGHTS), reason: z.string().trim().min(10).max(500) }).superRefine((value, ctx) => {
  const roleTotal = value.weights.requiredSkills + value.weights.profession + value.weights.career + value.weights.compatibility + value.weights.availability + value.weights.relevance + value.weights.learned + value.weights.warmPath;
  const feedTotal = value.weights.feedRoleMatch + value.weights.feedUrgency + value.weights.feedRelevance + value.weights.feedEyes + value.weights.feedFreshness + value.weights.feedNetwork + value.weights.feedExploration;
  if (roleTotal !== 100) ctx.addIssue({ code: "custom", message: "Role weights must total 100", path: ["weights"] });
  if (feedTotal !== 100) ctx.addIssue({ code: "custom", message: "Feed weights must total 100", path: ["weights"] });
});

export async function GET() {
  try { await requirePermission("system.view"); return NextResponse.json({ settings: await getActiveAlgorithmSettings(), defaultWeights: DEFAULT_ALGORITHM_WEIGHTS }); }
  catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePermission("system.manage"), input = schema.parse(await request.json()), db = getDb(), before = await getActiveAlgorithmSettings();
    const [{ version }] = await db.select({ version: algorithmSettings.version }).from(algorithmSettings).orderBy(desc(algorithmSettings.version)).limit(1);
    const nextVersion = (version ?? 0) + 1;
    const [settings] = await db.transaction(async tx => {
      await tx.update(algorithmSettings).set({ status: "superseded" }).where(eq(algorithmSettings.status, "active"));
      return tx.insert(algorithmSettings).values({ version: nextVersion, status: "active", provider: input.provider, blueprintModel: input.blueprintModel, embeddingModel: input.embeddingModel, rolloutStage: input.rolloutStage, weights: input.weights, createdBy: admin.user.id, activatedAt: new Date() }).returning();
    });
    let reindexJob = null;
    if (before.provider !== input.provider || before.embeddingModel !== input.embeddingModel) reindexJob = await createEmbeddingReindexJob(admin.user.id, input.provider);
    await audit(admin.user.id, "recommendation.settings_activated", "algorithm_settings", settings.id, { reindexJobId: reindexJob?.id }, { permission: "system.manage", reason: input.reason, before, after: { provider: settings.provider, blueprintModel: settings.blueprintModel, embeddingModel: settings.embeddingModel, rolloutStage: settings.rolloutStage, version: settings.version } });
    return NextResponse.json({ settings, reindexJob });
  } catch (error) { return apiError(error); }
}
