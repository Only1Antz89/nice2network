import "server-only";
import { createHash } from "node:crypto";
import { and, asc, count, desc, eq, gt, inArray, isNull, ne, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  blocks, careerHistory, milestones, projectEmbeddings, projectMembers, projectRecommendations, projectRoles, projects, recommendationJobs, sanctions, users,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import type { BlueprintRole } from "@/lib/recommendations/blueprint-schema";
import { createBlueprintProvider, withOneRetry } from "@/lib/recommendations/providers";
import {
  cosineSimilarity, developmentCompatibility, employmentOpportunity, lexicalProjectSimilarity, projectLocationCompatibility,
  scoreProjectSimilarity, similarityReasons, teamSizeSimilarity,
} from "@/lib/recommendations/project-similarity-scoring";
import { scoreRoleMatch } from "@/lib/recommendations/scoring";
import { getActiveAlgorithmSettings, type ActiveAlgorithmSettings } from "@/lib/recommendations/service";

export type SimilarProjectSuggestion = {
  projectId: string;
  title: string;
  summary: string;
  stage: string;
  location: string | null;
  teamSize: number;
  progress: number;
  score: number;
  reasons: string[];
  matchingRole: { id: string; title: string; openings: number; fitScore: number };
};

export function projectEmbeddingText(project: Pick<typeof projects.$inferSelect, "title" | "summary" | "description" | "industry">) {
  return [project.title, project.summary, project.description, project.industry].filter(Boolean).join(" | ");
}

function projectContentHash(project: Pick<typeof projects.$inferSelect, "title" | "summary" | "description" | "industry">) {
  return createHash("sha256").update(projectEmbeddingText(project)).digest("hex");
}

export async function ensureProjectEmbedding(projectId: string, suppliedSettings?: ActiveAlgorithmSettings) {
  const db = getDb(), settings = suppliedSettings ?? await getActiveAlgorithmSettings();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new ApiError(404, "Project not found");
  const contentHash = projectContentHash(project);
  const [stored] = await db.select().from(projectEmbeddings).where(and(
    eq(projectEmbeddings.projectId, projectId), eq(projectEmbeddings.provider, settings.provider),
    eq(projectEmbeddings.model, settings.embeddingModel), eq(projectEmbeddings.contentHash, contentHash), eq(projectEmbeddings.status, "ready"),
  )).limit(1);
  if (stored) return stored;
  const provider = createBlueprintProvider(settings);
  const embedding = await withOneRetry(() => provider.embed(projectEmbeddingText(project)));
  const [saved] = await db.insert(projectEmbeddings).values({ projectId, provider: settings.provider, model: settings.embeddingModel, contentHash, embedding }).onConflictDoUpdate({
    target: [projectEmbeddings.projectId, projectEmbeddings.provider, projectEmbeddings.model],
    set: { contentHash, embedding, status: "ready", updatedAt: new Date() },
  }).returning();
  return saved;
}

export async function createProjectEmbeddingReindexJob(requestedBy: string, provider?: string) {
  const settings = await getActiveAlgorithmSettings();
  const [{ total }] = await getDb().select({ total: count() }).from(projects).where(and(eq(projects.status, "active"), eq(projects.visibility, "network")));
  const [job] = await getDb().insert(recommendationJobs).values({ type: "project_embedding_reindex", provider: provider ?? settings.provider, total: Number(total), requestedBy }).returning();
  return job;
}

export async function processProjectEmbeddingReindex(jobId: string, batchSize = 20) {
  const db = getDb(), settings = await getActiveAlgorithmSettings();
  const [job] = await db.select().from(recommendationJobs).where(eq(recommendationJobs.id, jobId)).limit(1);
  if (!job || job.type !== "project_embedding_reindex" || !["queued", "running"].includes(job.status)) return job;
  await db.update(recommendationJobs).set({ status: "running", startedAt: job.startedAt ?? new Date() }).where(eq(recommendationJobs.id, jobId));
  const rows = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.status, "active"), eq(projects.visibility, "network"))).orderBy(asc(projects.createdAt)).offset(job.processed).limit(batchSize);
  for (const project of rows) await ensureProjectEmbedding(project.id, settings);
  const processed = Math.min(job.total, job.processed + rows.length), complete = processed >= job.total || rows.length === 0;
  const [updated] = await db.update(recommendationJobs).set({ processed, status: complete ? "completed" : "running", completedAt: complete ? new Date() : null }).where(eq(recommendationJobs.id, jobId)).returning();
  return updated;
}

function groupByProject<T extends { projectId: string }>(rows: T[]) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) grouped.set(row.projectId, [...(grouped.get(row.projectId) ?? []), row]);
  return grouped;
}

export async function previewSimilarProjects(input: {
  projectId: string;
  userId: string;
  roles: BlueprintRole[];
  milestones: Array<{ title: string; phase: "now" | "next" | "later" }>;
}) {
  const db = getDb(), settings = await getActiveAlgorithmSettings();
  const [[source], [owner], careers] = await Promise.all([
    db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1),
    db.select().from(users).where(eq(users.id, input.userId)).limit(1),
    db.select({ title: careerHistory.title }).from(careerHistory).where(eq(careerHistory.userId, input.userId)).orderBy(desc(careerHistory.current), desc(careerHistory.createdAt)).limit(10),
  ]);
  if (!source || source.ownerId !== input.userId || source.status !== "draft" || source.visibility !== "private") throw new ApiError(403, "Only the owner can check a private project draft");
  if (!owner) throw new ApiError(404, "Project owner not found");
  if (!settings.similarProjectSuggestionsEnabled) return { enabled: false, suggestions: [] as SimilarProjectSuggestion[] };

  const candidateRows = await db.select({ project: projects, ownerAgeBand: users.ageBand, ownerStatus: users.status }).from(projects).innerJoin(users, eq(users.id, projects.ownerId)).where(and(
    eq(projects.status, "active"), eq(projects.visibility, "network"), ne(projects.ownerId, input.userId), eq(users.status, "active"),
  )).orderBy(desc(projects.updatedAt)).limit(200);
  if (!candidateRows.length) return { enabled: true, suggestions: [] as SimilarProjectSuggestion[] };
  const candidateIds = candidateRows.map(row => row.project.id), targetOwnerIds = [...new Set(candidateRows.map(row => row.project.ownerId))], now = new Date();
  const [memberships, blockRows, sanctionRows, roleRows, milestoneRows, memberRows, embeddingRows, recommendationRows] = await Promise.all([
    db.select({ projectId: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.userId, input.userId), inArray(projectMembers.projectId, candidateIds))),
    db.select().from(blocks).where(or(
      and(eq(blocks.blockerId, input.userId), inArray(blocks.blockedId, targetOwnerIds)),
      and(eq(blocks.blockedId, input.userId), inArray(blocks.blockerId, targetOwnerIds)),
    )),
    db.select({ userId: sanctions.userId }).from(sanctions).where(and(inArray(sanctions.userId, targetOwnerIds), eq(sanctions.status, "active"), or(isNull(sanctions.expiresAt), gt(sanctions.expiresAt, now)))),
    db.select().from(projectRoles).where(and(inArray(projectRoles.projectId, candidateIds), eq(projectRoles.status, "open"))),
    db.select({ projectId: milestones.projectId, status: milestones.status }).from(milestones).where(inArray(milestones.projectId, candidateIds)),
    db.select({ projectId: projectMembers.projectId }).from(projectMembers).where(inArray(projectMembers.projectId, candidateIds)),
    db.select().from(projectEmbeddings).where(and(inArray(projectEmbeddings.projectId, candidateIds), eq(projectEmbeddings.provider, settings.provider), eq(projectEmbeddings.model, settings.embeddingModel), eq(projectEmbeddings.status, "ready"))),
    db.select({ projectId: projectRecommendations.projectId, roleId: projectRecommendations.roleId, score: projectRecommendations.score }).from(projectRecommendations).where(and(eq(projectRecommendations.userId, input.userId), inArray(projectRecommendations.projectId, candidateIds), eq(projectRecommendations.status, "active"))),
  ]);

  const excludedProjects = new Set(memberships.map(row => row.projectId));
  const blockedOwners = new Set(blockRows.map(row => row.blockerId === input.userId ? row.blockedId : row.blockerId));
  const sanctionedOwners = new Set(sanctionRows.map(row => row.userId));
  const rolesByProject = groupByProject(roleRows.filter(role => role.filled < role.capacity));
  const milestonesByProject = groupByProject(milestoneRows);
  const teamCount = new Map<string, number>();
  for (const row of memberRows) teamCount.set(row.projectId, (teamCount.get(row.projectId) ?? 0) + 1);
  const embeddings = new Map(embeddingRows.map(row => [row.projectId, row]));
  const recommendationScore = new Map(recommendationRows.map(row => [row.roleId, row.score]));
  let sourceEmbedding: number[] | null = null;
  try { sourceEmbedding = (await ensureProjectEmbedding(source.id, settings)).embedding; } catch { /* Strict lexical fallback keeps publication available. */ }

  const sourcePlannedSize = 1 + input.roles.reduce((total, role) => total + role.headcount, 0);
  const results: SimilarProjectSuggestion[] = [];
  for (const candidate of candidateRows) {
    const target = candidate.project;
    if (excludedProjects.has(target.id) || blockedOwners.has(target.ownerId) || sanctionedOwners.has(target.ownerId)) continue;
    if (owner.ageBand !== candidate.ownerAgeBand && [owner.ageBand, candidate.ownerAgeBand].includes("teen_16_17")) continue;
    const targetRoles = rolesByProject.get(target.id) ?? [];
    if (!targetRoles.length) continue;

    let bestRole: typeof targetRoles[number] | null = null, bestFit = 0;
    for (const role of targetRoles) {
      const direct = scoreRoleMatch({
        member: { profession: owner.profession, primarySkill: owner.primarySkill, secondarySkill: owner.secondarySkill, tertiarySkill: owner.tertiarySkill, industry: owner.industry, interests: owner.interests, city: owner.city, country: owner.country, timezone: owner.timezone, workMode: owner.workMode, availability: owner.availability, careerTitles: careers.map(row => row.title) },
        role, project: target, weights: { requiredSkills: settings.weights.requiredSkills, profession: settings.weights.profession, career: settings.weights.career, compatibility: settings.weights.compatibility, availability: settings.weights.availability, relevance: settings.weights.relevance, learned: settings.weights.learned, warmPath: settings.weights.warmPath },
      });
      const fit = Math.max(direct.score, recommendationScore.get(role.id) ?? 0);
      if (fit > bestFit) { bestFit = fit; bestRole = role; }
    }
    if (!bestRole || bestFit < 45) continue;

    const targetEmbedding = embeddings.get(target.id);
    const targetHash = projectContentHash(target);
    const semantic = sourceEmbedding && targetEmbedding?.contentHash === targetHash
      ? cosineSimilarity(sourceEmbedding, targetEmbedding.embedding)
      : lexicalProjectSimilarity(source, target);
    const targetMilestones = milestonesByProject.get(target.id) ?? [];
    const completed = targetMilestones.filter(row => row.status === "complete").length;
    const openings = Math.max(0, bestRole.capacity - bestRole.filled);
    const location = projectLocationCompatibility(source, target);
    const size = teamSizeSimilarity(sourcePlannedSize, (teamCount.get(target.id) ?? 1) + targetRoles.reduce((total, role) => total + Math.max(0, role.capacity - role.filled), 0));
    const development = developmentCompatibility(source.stage, target.stage, completed, targetMilestones.length);
    const employment = employmentOpportunity(bestFit, openings);
    const components = { semantic, employment, location, size, development, roleFitScore: bestFit };
    const scored = scoreProjectSimilarity(components);
    if (!scored.qualifies) continue;
    results.push({
      projectId: target.id, title: target.title, summary: target.summary, stage: target.stage,
      location: target.location, teamSize: teamCount.get(target.id) ?? 1,
      progress: targetMilestones.length ? Math.round(completed / targetMilestones.length * 100) : 0,
      score: scored.score,
      reasons: similarityReasons({ ...components, roleTitle: bestRole.title, openings, locationLabel: target.location }),
      matchingRole: { id: bestRole.id, title: bestRole.title, openings, fitScore: bestFit },
    });
  }
  return { enabled: true, suggestions: results.sort((left, right) => right.score - left.score || left.projectId.localeCompare(right.projectId)).slice(0, 3) };
}
