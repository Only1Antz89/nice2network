import "server-only";
import { createHash } from "node:crypto";
import { and, asc, count, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  algorithmSettings, blocks, careerHistory, memberAffinities, memberEmbeddings, milestones, notificationPreferences, notifications,
  privacySettings, projectBlueprints, projectMembers, projectRecommendations, projectRoles, projects, recommendationJobs,
  roleEmbeddings, sanctions, users,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import { createNotifications } from "@/lib/notifications";
import { trackProductEvent } from "@/lib/analytics";
import { blueprintInputSchema, projectBlueprintSchema, type BlueprintInput, type BlueprintRole, type ProjectBlueprint } from "./blueprint-schema";
import { fallbackBlueprint } from "./fallback";
import { createBlueprintProvider, withOneRetry } from "./providers";
import { isRolePhaseActive, scoreRoleMatch } from "./scoring";

export const DEFAULT_ALGORITHM_WEIGHTS = {
  requiredSkills: 35, profession: 20, career: 10, compatibility: 15, availability: 8, relevance: 5, learned: 5, warmPath: 2,
  feedRoleMatch: 55, feedUrgency: 12, feedRelevance: 8, feedEyes: 10, feedFreshness: 5, feedNetwork: 5, feedExploration: 5,
};

export type ActiveAlgorithmSettings = {
  id: string | null; version: number; provider: "openai" | "gemini"; blueprintModel: string; embeddingModel: string;
  embeddingDimensions: number; rolloutStage: number; weights: Record<string, number>;
};

export async function getActiveAlgorithmSettings(): Promise<ActiveAlgorithmSettings> {
  const [active] = await getDb().select().from(algorithmSettings).where(eq(algorithmSettings.status, "active")).orderBy(desc(algorithmSettings.version)).limit(1);
  if (active) return { ...active, provider: active.provider === "gemini" ? "gemini" : "openai" };
  return {
    id: null, version: 1, provider: "openai",
    blueprintModel: process.env.OPENAI_BLUEPRINT_MODEL || "gpt-4.1-mini",
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    embeddingDimensions: 768, rolloutStage: 1, weights: DEFAULT_ALGORITHM_WEIGHTS,
  };
}

function scrubCareerText(value: string | null) {
  if (!value) return null;
  return value.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[removed]").replace(/\+?\d[\d\s().-]{7,}\d/g, "[removed]").slice(0, 240);
}

export async function buildBlueprintInput(projectId: string): Promise<{ input: BlueprintInput; ownerId: string }> {
  const db = getDb();
  const [row] = await db.select({ project: projects, owner: users }).from(projects).innerJoin(users, eq(users.id, projects.ownerId)).where(eq(projects.id, projectId)).limit(1);
  if (!row) throw new ApiError(404, "Project not found");
  const career = await db.select({ title: careerHistory.title, description: careerHistory.description }).from(careerHistory).where(eq(careerHistory.userId, row.owner.id)).orderBy(desc(careerHistory.current), asc(careerHistory.sortOrder)).limit(10);
  const input = blueprintInputSchema.parse({
    project: {
      title: row.project.title, summary: row.project.summary, description: row.project.description, industry: row.project.industry, stage: row.project.stage,
      workMode: row.project.workMode, city: row.project.city, country: row.project.country, timezone: row.project.timezone, remoteFallback: row.project.allowRemoteFallback,
    },
    owner: {
      profession: row.owner.profession,
      rankedSkills: [row.owner.primarySkill, row.owner.secondarySkill, row.owner.tertiarySkill],
      industry: row.owner.industry,
      careerSummary: career.map(item => ({ title: item.title, description: scrubCareerText(item.description) })),
    },
  });
  return { input, ownerId: row.owner.id };
}

export async function generateProjectBlueprint(projectId: string, requestedBy: string) {
  const db = getDb();
  const { input, ownerId } = await buildBlueprintInput(projectId);
  if (ownerId !== requestedBy) throw new ApiError(403, "Only a project owner can generate its team blueprint");
  const settings = await getActiveAlgorithmSettings();
  const inputHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const [{ value: maxVersion }] = await db.select({ value: sql<number>`coalesce(max(${projectBlueprints.version}), 0)` }).from(projectBlueprints).where(eq(projectBlueprints.projectId, projectId));
  let blueprint: ProjectBlueprint;
  let failureStatus: string | null = null;
  let provider = settings.provider;
  let model = settings.blueprintModel;
  const started = Date.now();
  try {
    const implementation = createBlueprintProvider(settings);
    blueprint = await withOneRetry(() => implementation.generate(input));
  } catch (error) {
    failureStatus = error instanceof Error ? error.message.slice(0, 240) : "provider_unavailable";
    blueprint = fallbackBlueprint(input);
    provider = "rules" as typeof provider;
    model = "industry-template-v1";
  }
  const validated = projectBlueprintSchema.parse(blueprint);
  const [record] = await db.insert(projectBlueprints).values({
    projectId, version: Number(maxVersion) + 1, status: "draft", provider, model, inputHash, failureStatus,
    outcome: validated.outcome, assumptions: validated.assumptions, coveredContributions: validated.coveredContributions,
    milestones: validated.milestones, gaps: validated.gaps, risks: validated.risks, roles: validated.roles,
  }).returning();
  await trackProductEvent({ actorId: requestedBy, event: "blueprint_generated", entityType: "project", entityId: projectId, properties: { provider, result: failureStatus ? "fallback" : "success" } });
  return { ...record, latencyMs: Date.now() - started, usedFallback: Boolean(failureStatus) };
}

export async function approveProjectBlueprint(input: { projectId: string; blueprintId: string; userId: string; roles: BlueprintRole[]; milestones:Array<{title:string;description?:string;phase:"now"|"next"|"later";ownerId?:string|null;dueAt?:string|null}>; visibility: "network" | "connections" | "private" }) {
  const db = getDb();
  const roles = projectBlueprintSchema.shape.roles.parse(input.roles);
  const [blueprint] = await db.select({ blueprint: projectBlueprints, project: projects }).from(projectBlueprints).innerJoin(projects, eq(projects.id, projectBlueprints.projectId)).where(and(eq(projectBlueprints.id, input.blueprintId), eq(projectBlueprints.projectId, input.projectId))).limit(1);
  if (!blueprint || blueprint.project.ownerId !== input.userId) throw new ApiError(403, "Only the project owner can approve this blueprint");
  if (blueprint.blueprint.status !== "draft") throw new ApiError(409, "This blueprint has already been reviewed");
  await db.transaction(async tx => {
    await tx.update(projectBlueprints).set({ status: "superseded" }).where(and(eq(projectBlueprints.projectId, input.projectId), eq(projectBlueprints.status, "approved")));
    await tx.update(projectBlueprints).set({ status: "approved", roles, approvedAt: new Date(), approvedBy: input.userId }).where(eq(projectBlueprints.id, input.blueprintId));
    // Preserve already-filled legacy roles and their membership history; only replace still-open gaps.
    await tx.delete(projectRoles).where(and(eq(projectRoles.projectId, input.projectId), eq(projectRoles.filled, 0), eq(projectRoles.status, "open")));
    await tx.insert(projectRoles).values(roles.map(role => ({
      projectId: input.projectId, blueprintId: input.blueprintId, title: role.title, department: role.department, description: role.reason,
      skills: [...new Set([...role.requiredSkills, ...role.usefulSkills])], professions: role.professions, requiredSkills: role.requiredSkills,
      usefulSkills: role.usefulSkills, phase: role.phase, criticality: role.criticality, workMode: role.workMode, reason: role.reason, capacity: role.headcount,
    })));
    const [{ total }] = await tx.select({ total: count() }).from(milestones).where(eq(milestones.projectId, input.projectId));
    if (blueprint.project.status === "draft") {
      await tx.delete(milestones).where(eq(milestones.projectId,input.projectId));
      await tx.insert(milestones).values(input.milestones.map((item,index)=>({projectId:input.projectId,title:item.title,description:item.description,phase:item.phase,ownerId:item.ownerId,dueAt:item.dueAt?new Date(item.dueAt):null,status:index===0?"in_progress":"planned",startedAt:index===0?new Date():null,sortOrder:index})));
    } else if (!Number(total)) await tx.insert(milestones).values(input.milestones.map((item,index)=>({projectId:input.projectId,title:item.title,description:item.description,phase:item.phase,ownerId:item.ownerId,dueAt:item.dueAt?new Date(item.dueAt):null,status:index===0?"in_progress":"planned",startedAt:index===0?new Date():null,sortOrder:index})));
    await tx.update(projects).set({ status: "active", visibility: input.visibility, updatedAt: new Date() }).where(eq(projects.id, input.projectId));
  });
  await recomputeProjectRecommendations(input.projectId);
  await trackProductEvent({ actorId: input.userId, event: "blueprint_approved", entityType: "project", entityId: input.projectId, properties: { roleCount: roles.length } });
}

function embeddingTextForRole(role: typeof projectRoles.$inferSelect, project: typeof projects.$inferSelect) {
  return [role.title, role.department, ...role.professions, ...role.requiredSkills, ...role.usefulSkills, project.industry, project.workMode].filter(Boolean).join(" | ");
}

function embeddingTextForMember(member: typeof users.$inferSelect, careerTitles: string[]) {
  return [member.profession, member.primarySkill, member.secondarySkill, member.tertiarySkill, member.industry, ...member.interests, ...careerTitles].filter(Boolean).join(" | ");
}

async function roleSemanticSimilarities(role: typeof projectRoles.$inferSelect, project: typeof projects.$inferSelect, candidateIds: string[], settings: ActiveAlgorithmSettings) {
  const result = new Map<string, number>();
  if (!candidateIds.length) return result;
  try {
    const provider = createBlueprintProvider(settings);
    const roleText = embeddingTextForRole(role, project), contentHash = createHash("sha256").update(roleText).digest("hex");
    let [stored] = await getDb().select().from(roleEmbeddings).where(and(eq(roleEmbeddings.roleId, role.id), eq(roleEmbeddings.provider, settings.provider), eq(roleEmbeddings.model, settings.embeddingModel), eq(roleEmbeddings.contentHash, contentHash))).limit(1);
    if (!stored) {
      const embedding = await withOneRetry(() => provider.embed(roleText));
      [stored] = await getDb().insert(roleEmbeddings).values({ roleId: role.id, provider: settings.provider, model: settings.embeddingModel, contentHash, embedding }).onConflictDoUpdate({ target: [roleEmbeddings.roleId, roleEmbeddings.provider, roleEmbeddings.model], set: { contentHash, embedding, status: "ready", updatedAt: new Date() } }).returning();
    }
    const vectorLiteral = `[${stored.embedding.join(",")}]`;
    const rows = await getDb().execute(sql`select user_id, greatest(0, 1 - (embedding <=> ${vectorLiteral}::vector))::float as similarity from member_embeddings where provider = ${settings.provider} and model = ${settings.embeddingModel} and status = 'ready' and user_id in (${sql.join(candidateIds.map(id=>sql`${id}::uuid`),sql`, `)}) order by embedding <=> ${vectorLiteral}::vector limit 200`);
    for (const row of rows as unknown as Array<{ user_id: string; similarity: number }>) result.set(row.user_id, Number(row.similarity));
  } catch {
    // Exact and alias matching remains available while embeddings are absent or rebuilding.
  }
  return result;
}

async function eligibleCandidates(project: typeof projects.$inferSelect) {
  const db = getDb(), now = new Date();
  const candidates = await db.select({ user: users, privacy: privacySettings }).from(users).leftJoin(privacySettings, eq(privacySettings.userId, users.id)).where(and(
    eq(users.status, "active"), ne(users.id, project.ownerId), sql`${users.emailVerified} is not null`, sql`${users.onboardingCompletedAt} is not null`,
    inArray(users.availability, ["open", "limited"]), or(isNull(privacySettings.profileVisibility), ne(privacySettings.profileVisibility, "private")),
    or(isNull(privacySettings.useActivityForMatching), eq(privacySettings.useActivityForMatching, true)),
  )).limit(500);
  if (!candidates.length) return [];
  const ids = candidates.map(item => item.user.id);
  const [owner] = await db.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, project.ownerId)).limit(1);
  const [blocked, sanctioned, careers, loads, ownerProjects] = await Promise.all([
    db.select().from(blocks).where(or(and(eq(blocks.blockerId, project.ownerId), inArray(blocks.blockedId, ids)), and(eq(blocks.blockedId, project.ownerId), inArray(blocks.blockerId, ids)))),
    db.select({ userId: sanctions.userId }).from(sanctions).where(and(inArray(sanctions.userId, ids), eq(sanctions.status, "active"), or(isNull(sanctions.expiresAt), gt(sanctions.expiresAt, now)))),
    db.select({ userId: careerHistory.userId, title: careerHistory.title }).from(careerHistory).where(inArray(careerHistory.userId, ids)),
    db.select({ userId: projectMembers.userId, total: count() }).from(projectMembers).innerJoin(projects, and(eq(projects.id, projectMembers.projectId), eq(projects.status, "active"))).where(inArray(projectMembers.userId, ids)).groupBy(projectMembers.userId),
    db.select({ projectId: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.userId, project.ownerId)),
  ]);
  const blockedIds = new Set(blocked.map(item => item.blockerId === project.ownerId ? item.blockedId : item.blockerId));
  const sanctionedIds = new Set(sanctioned.map(item => item.userId));
  const careersByUser = new Map<string, string[]>();
  for (const item of careers) careersByUser.set(item.userId, [...(careersByUser.get(item.userId) ?? []), item.title]);
  const loadByUser = new Map(loads.map(item => [item.userId, Number(item.total)]));
  const shared = ownerProjects.length ? new Set((await db.select({ userId: projectMembers.userId }).from(projectMembers).where(and(inArray(projectMembers.projectId, ownerProjects.map(item => item.projectId)), inArray(projectMembers.userId, ids)))).map(item => item.userId)) : new Set<string>();
  return candidates.filter(item => {
    const mixedAge = owner?.ageBand !== item.user.ageBand && [owner?.ageBand, item.user.ageBand].includes("teen_16_17");
    return !mixedAge && !blockedIds.has(item.user.id) && !sanctionedIds.has(item.user.id);
  }).map(item => ({ ...item, careerTitles: careersByUser.get(item.user.id) ?? [], currentProjectLoad: loadByUser.get(item.user.id) ?? 0, warmPath: shared.has(item.user.id) }));
}

export async function recomputeProjectRecommendations(projectId: string) {
  const db = getDb(), settings = await getActiveAlgorithmSettings();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.status !== "active" || project.visibility === "private") return { generated: 0 };
  const roles = await db.select().from(projectRoles).where(and(eq(projectRoles.projectId, projectId), eq(projectRoles.status, "open"))).orderBy(asc(projectRoles.createdAt));
  const candidates = await eligibleCandidates(project);
  await db.update(projectRecommendations).set({ status: "stale" }).where(and(eq(projectRecommendations.projectId, projectId), eq(projectRecommendations.status, "active")));
  let generated = 0;
  for (const role of roles) {
    if (!isRolePhaseActive(role.phase, project.stage, roles)) continue;
    const alreadyMembers = new Set((await db.select({ userId: projectMembers.userId }).from(projectMembers).where(eq(projectMembers.projectId, projectId))).map(item => item.userId));
    const roleCandidates = candidates.filter(item => !alreadyMembers.has(item.user.id));
    const semantic = await roleSemanticSimilarities(role, project, roleCandidates.map(item => item.user.id), settings);
    const affinityRows = roleCandidates.length ? await db.select().from(memberAffinities).where(and(inArray(memberAffinities.userId, roleCandidates.map(item => item.user.id)), inArray(memberAffinities.dimensionKey, [project.industry.toLowerCase(), role.department.toLowerCase(), ...role.requiredSkills.map(value => value.toLowerCase())]))) : [];
    const affinity = new Map<string, number>();
    for (const item of affinityRows) affinity.set(item.userId, (affinity.get(item.userId) ?? 0) + item.score);
    for (const candidate of roleCandidates) {
      const learned = candidate.user.ageBand === "teen_16_17" || candidate.privacy?.useActivityForMatching === false ? 0 : Math.min(1, Math.max(0, (affinity.get(candidate.user.id) ?? 0) / 40));
      const score = scoreRoleMatch({
        member: { ...candidate.user, interests: candidate.user.interests, careerTitles: candidate.careerTitles, currentProjectLoad: candidate.currentProjectLoad },
        role, project, semanticSimilarity: semantic.get(candidate.user.id), learnedAffinity: learned, warmPath: candidate.warmPath,
        weights: { requiredSkills: settings.weights.requiredSkills, profession: settings.weights.profession, career: settings.weights.career, compatibility: settings.weights.compatibility, availability: settings.weights.availability, relevance: settings.weights.relevance, learned: settings.weights.learned, warmPath: settings.weights.warmPath },
      });
      if (!score.eligible) continue;
      await db.insert(projectRecommendations).values({ userId: candidate.user.id, projectId, roleId: role.id, algorithmVersion: settings.version, score: score.score, tier: score.tier, componentScores: score.componentScores, reasons: score.reasons, status: "active", expiresAt: new Date(Date.now() + 30 * 86_400_000) }).onConflictDoUpdate({ target: [projectRecommendations.userId, projectRecommendations.roleId, projectRecommendations.algorithmVersion], set: { score: score.score, tier: score.tier, componentScores: score.componentScores, reasons: score.reasons, status: "active", generatedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86_400_000) } });
      generated++;
    }
  }
  if (settings.rolloutStage >= 3) await sendStrongMatchAlerts(projectId, project.ownerId);
  return { generated };
}

export async function recomputeMemberRecommendations(userId: string) {
  const db = getDb();
  await db.delete(memberEmbeddings).where(eq(memberEmbeddings.userId, userId));
  const projectRows = await db.selectDistinct({ id: projects.id }).from(projects).innerJoin(projectRoles, eq(projectRoles.projectId, projects.id)).where(and(eq(projects.status, "active"), eq(projects.visibility, "network"), eq(projectRoles.status, "open"))).orderBy(desc(projects.updatedAt)).limit(50);
  for (const project of projectRows) await recomputeProjectRecommendations(project.id);
}

async function sendStrongMatchAlerts(projectId: string, actorId: string) {
  const db = getDb(), start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const candidates = await db.select({ recommendation: projectRecommendations, projectTitle: projects.title, ageBand: users.ageBand, matches: notificationPreferences.matches })
    .from(projectRecommendations).innerJoin(projects, eq(projects.id, projectRecommendations.projectId)).innerJoin(users, eq(users.id, projectRecommendations.userId)).leftJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
    .where(and(eq(projectRecommendations.projectId, projectId), eq(projectRecommendations.status, "active"), eq(projectRecommendations.tier, "strong"), ne(users.ageBand, "teen_16_17"), isNull(projectRecommendations.alertedAt))).orderBy(desc(projectRecommendations.score)).limit(50);
  const notificationsToSend: Parameters<typeof createNotifications>[0] = [];
  const selectedUsers = new Set<string>();
  for (const item of candidates) {
    if (item.matches === false || selectedUsers.has(item.recommendation.userId)) continue;
    const [{ total }] = await db.select({ total: count() }).from(notifications).where(and(eq(notifications.userId, item.recommendation.userId), eq(notifications.type, "match"), gt(notifications.createdAt, start)));
    if (Number(total) >= 2) continue;
    notificationsToSend.push({ userId: item.recommendation.userId, actorId, type: "match", title: "A strong project match", body: `${item.projectTitle} matches your professional profile.`, entityType: "recommendation", entityId: item.recommendation.id, href: `/?recommendation=${item.recommendation.id}` });
    selectedUsers.add(item.recommendation.userId);
    await db.update(projectRecommendations).set({ alertedAt: new Date() }).where(eq(projectRecommendations.id, item.recommendation.id));
  }
  await createNotifications(notificationsToSend);
}

export async function createEmbeddingReindexJob(requestedBy: string, provider?: string) {
  const settings = await getActiveAlgorithmSettings();
  const [{ total }] = await getDb().select({ total: count() }).from(users).where(and(eq(users.status, "active"), sql`${users.onboardingCompletedAt} is not null`));
  const [job] = await getDb().insert(recommendationJobs).values({ type: "embedding_reindex", provider: provider ?? settings.provider, total: Number(total), requestedBy }).returning();
  return job;
}

export async function processEmbeddingReindex(jobId: string, batchSize = 20) {
  const db = getDb(), settings = await getActiveAlgorithmSettings();
  const [job] = await db.select().from(recommendationJobs).where(eq(recommendationJobs.id, jobId)).limit(1);
  if (!job || !["queued", "running"].includes(job.status)) return job;
  const provider = createBlueprintProvider(settings);
  await db.update(recommendationJobs).set({ status: "running", startedAt: job.startedAt ?? new Date() }).where(eq(recommendationJobs.id, jobId));
  const rows = await db.select().from(users).where(and(eq(users.status, "active"), sql`${users.onboardingCompletedAt} is not null`)).orderBy(asc(users.createdAt)).offset(job.processed).limit(batchSize);
  for (const member of rows) {
    const career = await db.select({ title: careerHistory.title }).from(careerHistory).where(eq(careerHistory.userId, member.id));
    const text = embeddingTextForMember(member, career.map(item => item.title));
    if (!text.trim()) continue;
    const contentHash = createHash("sha256").update(text).digest("hex"), embedding = await withOneRetry(() => provider.embed(text));
    await db.insert(memberEmbeddings).values({ userId: member.id, provider: settings.provider, model: settings.embeddingModel, contentHash, embedding }).onConflictDoUpdate({ target: [memberEmbeddings.userId, memberEmbeddings.provider, memberEmbeddings.model], set: { contentHash, embedding, status: "ready", updatedAt: new Date() } });
  }
  const processed = Math.min(job.total, job.processed + rows.length), complete = processed >= job.total || rows.length === 0;
  const [updated] = await db.update(recommendationJobs).set({ processed, status: complete ? "completed" : "running", completedAt: complete ? new Date() : null }).where(eq(recommendationJobs.id, jobId)).returning();
  return updated;
}
