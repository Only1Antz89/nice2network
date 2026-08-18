import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb, isDatabaseConfigured } from "@/db";
import { adminAssignments, follows, projectFollows, projectMembers, projectRecommendations, projectRoles, projects, recommendationEvents, savedItems, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { trackProductEvent } from "@/lib/analytics";
import { canonicalTerm, feedScore } from "@/lib/recommendations/scoring";
import { getActiveAlgorithmSettings, recomputeProjectRecommendations } from "@/lib/recommendations/service";
import { ensureProjectEmbedding } from "@/lib/recommendations/project-similarity";
import { coOwnerIdsSchema, createCoOwnerInvitations, type CoOwnerInvitationDelivery } from "@/lib/project-co-owners";
import { createNotifications } from "@/lib/notifications";

const roleSchema = z.object({
  title: z.string().min(2).max(80), department: z.string().min(2).max(80), description: z.string().max(500).optional(),
  skills: z.array(z.string().max(50)).max(12).default([]), professions: z.array(z.string().max(80)).max(8).default([]),
  requiredSkills: z.array(z.string().max(80)).max(12).default([]), usefulSkills: z.array(z.string().max(80)).max(12).default([]),
  phase: z.enum(["now", "next", "later"]).default("now"), criticality: z.enum(["critical", "important", "useful"]).default("important"),
  workMode: z.enum(["remote", "hybrid", "in_person"]).optional(), reason: z.string().max(500).optional(), capacity: z.number().int().min(1).max(10).default(1),
});
const inputSchema = z.object({
  title: z.string().trim().min(4).max(120), summary: z.string().trim().min(10).max(500), description: z.string().max(5000).optional(), industry: z.string().min(2).max(80),
  stage: z.enum(["idea", "planning", "building", "launching"]).default("idea"), visibility: z.enum(["network", "connections", "private"]).default("network"),
  workMode: z.enum(["remote", "hybrid", "in_person"]).default("remote"), city: z.string().max(100).nullable().optional(), country: z.string().max(100).nullable().optional(), timezone: z.string().max(80).default("Europe/London"), allowRemoteFallback: z.boolean().default(true), accent: z.string().regex(/^#[0-9a-f]{6}$/i).default("#ff6b35"),
  imageUrl: z.string().max(1_500_000).refine(value=>!value||/^data:image\/(jpeg|png|webp);base64,/i.test(value)).nullable().optional(),
  roles: z.array(roleSchema).max(18).default([]),
  coOwnerIds: coOwnerIdsSchema,
});

type FeedProject = Awaited<ReturnType<typeof baseProjects>>[number] & { matchScore?: number; recommendationId?: string; recommendationTier?: string; recommendationReasons?: string[]; matchedRole?: string; feedScore?: number; eyeMomentum?: number };

async function baseProjects(memberId: string, condition: ReturnType<typeof and> | ReturnType<typeof or> | undefined) {
  const eyeCount = sql<number>`(select count(*)::int from project_eyes pe join users eu on eu.id = pe.user_id where pe.project_id = ${projects.id} and pe.user_id <> ${projects.ownerId} and eu.status = 'active' and eu.email_verified is not null and not exists (select 1 from sanctions s where s.user_id = pe.user_id and s.status = 'active' and (s.expires_at is null or s.expires_at > now())))`;
  const commentCount = sql<number>`(select count(*)::int from project_comments pc where pc.project_id = ${projects.id} and pc.status = 'visible')`;
  return getDb().select({
    id: projects.id, title: projects.title, summary: projects.summary, description: projects.description, industry: projects.industry, stage: projects.stage,
    status: projects.status, visibility: projects.visibility, accent: projects.accent, imageUrl:projects.imageUrl, workMode: projects.workMode, city: projects.city, country: projects.country, deletionRequestedAt:projects.deletionRequestedAt, deletionScheduledAt:projects.deletionScheduledAt, deletionRequestedBy:projects.deletionRequestedBy,
    ownerId: projects.ownerId, ownerName: users.name, ownerImage: users.image,
    isDemo: sql<boolean>`${users.role} = 'demo_member'`,
    ownerIsAdmin: sql<boolean>`case when ${adminAssignments.status} = 'active' then true else false end`,
    isOwner: sql<boolean>`${projects.ownerId} = ${memberId} or exists (select 1 from project_members pm where pm.project_id = ${projects.id} and pm.user_id = ${memberId} and pm.membership_role = 'co_owner')`,
    isPrimaryOwner: sql<boolean>`${projects.ownerId} = ${memberId}`,
    isMember: sql<boolean>`${projects.ownerId} = ${memberId} or exists (select 1 from project_members pm where pm.project_id = ${projects.id} and pm.user_id = ${memberId})`,
    isFollowingProject: sql<boolean>`exists(select 1 from ${projectFollows} pf where pf.project_id=${projects.id} and pf.user_id=${memberId})`,
    isPinned: sql<boolean>`coalesce(${savedItems.pinned}, false)`, isBookmarked: sql<boolean>`coalesce(${savedItems.bookmarked}, false)`, eyeCount, commentCount,
    roles:sql<Array<{id:string;title:string;department:string;phase:string;status:string;criticality:string;capacity:number;filled:number}>>`coalesce((select json_agg(json_build_object('id',pr.id,'title',pr.title,'department',pr.department,'phase',pr.phase,'status',pr.status,'criticality',pr.criticality,'capacity',pr.capacity,'filled',pr.filled) order by pr.created_at) from project_roles pr where pr.project_id=${projects.id}),'[]'::json)`,
    team:sql<Array<{userId:string;roleId:string|null;name:string|null;image:string|null;profession:string|null;department:string|null;membershipRole:string}>>`coalesce((select json_agg(json_build_object('userId',pm.user_id,'roleId',pm.role_id,'name',tu.name,'image',tu.image,'profession',tu.profession,'department',pm.department,'membershipRole',pm.membership_role) order by pm.joined_at) from project_members pm join users tu on tu.id=pm.user_id where pm.project_id=${projects.id}),'[]'::json)`, createdAt: projects.createdAt,
  }).from(projects).innerJoin(users, eq(users.id, projects.ownerId))
    .leftJoin(adminAssignments, and(eq(adminAssignments.userId, projects.ownerId), eq(adminAssignments.status, "active")))
    .leftJoin(savedItems, and(eq(savedItems.entityId, projects.id), eq(savedItems.entityType, "project"), eq(savedItems.userId, memberId)))
    .where(condition).orderBy(desc(projects.createdAt), asc(projects.id)).limit(200);
}

function enforceOwnerDiversity(rows: FeedProject[]) {
  const output: FeedProject[] = [], held: FeedProject[] = [], firstPageCounts = new Map<string, number>();
  for (const row of rows) {
    if (output.length < 20 && !row.isPinned) {
      const count = firstPageCounts.get(row.ownerId) ?? 0;
      if (count >= 2) { held.push(row); continue; }
      firstPageCounts.set(row.ownerId, count + 1);
    }
    output.push(row);
  }
  return [...output, ...held];
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ projects: [], nextCursor: null, algorithmMode: "public" });
  try {
    const session=await auth(),member=session?.user,viewerId=member?.id || null,db = getDb(), url = new URL(request.url), scope = url.searchParams.get("scope") ?? "discover", filter = (url.searchParams.get("filter") ?? "for_you").toLowerCase().replaceAll(" ", "_");
    if(scope==="mine"&&!viewerId)throw new ApiError(401,"Sign in required");
    const limit = Math.min(40, Math.max(1, Number(url.searchParams.get("limit") ?? 20))), cursor = url.searchParams.get("cursor");
    const industryFilter = url.searchParams.get("industry")?.trim().toLowerCase() ?? "";
    const stageFilter = url.searchParams.get("stage")?.trim().toLowerCase() ?? "";
    const workModeFilter = url.searchParams.get("workMode")?.trim().toLowerCase() ?? "";
    const locationFilter = url.searchParams.get("location")?.trim().toLowerCase() ?? "";
    const memberId=viewerId??"00000000-0000-0000-0000-000000000000";
    const memberships = viewerId?await db.select({ projectId: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.userId, viewerId)):[];
    const memberProjectIds = memberships.map(row => row.projectId);
    const condition = scope === "mine"
      ? and(ne(projects.status, "deleted"), or(eq(projects.ownerId, memberId), memberProjectIds.length ? inArray(projects.id, memberProjectIds) : eq(projects.ownerId, memberId)))
      : and(eq(projects.status, "active"), eq(projects.visibility, "network"));
    let rows: FeedProject[] = await baseProjects(memberId, condition);
    rows = rows.filter(row =>
      (!industryFilter || row.industry.toLowerCase() === industryFilter) &&
      (!stageFilter || row.stage.toLowerCase() === stageFilter) &&
      (!workModeFilter || row.workMode?.toLowerCase() === workModeFilter) &&
      (!locationFilter || [row.city, row.country].filter(Boolean).join(" ").toLowerCase().includes(locationFilter))
    );
    if (scope === "discover") {
      if(!viewerId){const start=cursor?Math.max(0,rows.findIndex(row=>row.id===cursor)+1):0,page=rows.slice(start,start+limit);return NextResponse.json({projects:page,nextCursor:start+limit<rows.length?page.at(-1)?.id:null,algorithmMode:"public"})}
      const settings = await getActiveAlgorithmSettings();
      const [profile, recommendations] = await Promise.all([
        db.select({ industry: users.industry, interests: users.interests, ageBand: users.ageBand }).from(users).where(eq(users.id, viewerId)).limit(1).then(result => result[0]),
        db.select({ recommendation: projectRecommendations, role: projectRoles }).from(projectRecommendations).innerJoin(projectRoles, eq(projectRoles.id, projectRecommendations.roleId)).where(and(eq(projectRecommendations.userId, viewerId), eq(projectRecommendations.status, "active"))).orderBy(desc(projectRecommendations.score), asc(projectRecommendations.id)),
      ]);
      const best = new Map<string, typeof recommendations[number]>();
      for (const item of recommendations) if (!best.has(item.recommendation.projectId)) best.set(item.recommendation.projectId, item);
      const projectIds = rows.map(row => row.id);
      const eyeActivity = projectIds.length ? await db.execute(sql`select pe.project_id, count(*)::int as lifetime, coalesce(sum(case when pe.created_at >= now() - interval '24 hours' then 1 when pe.created_at >= now() - interval '7 days' then greatest(0, extract(epoch from ((now() - interval '7 days') - pe.created_at)) / -518400) else 0 end), 0)::float as recent from project_eyes pe join users u on u.id = pe.user_id join projects p on p.id = pe.project_id where pe.project_id in (${sql.join(projectIds.map(id=>sql`${id}::uuid`),sql`, `)}) and pe.user_id <> p.owner_id and u.status = 'active' and u.email_verified is not null and not exists (select 1 from sanctions s where s.user_id = pe.user_id and s.status = 'active' and (s.expires_at is null or s.expires_at > now())) group by pe.project_id`) as unknown as Array<{ project_id: string; lifetime: number; recent: number }> : [];
      const activity = new Map(eyeActivity.map(item => [item.project_id, { lifetime: Number(item.lifetime), recent: Number(item.recent) }]));
      const recentValues = eyeActivity.map(item => Number(item.recent)).sort((a, b) => a - b), denominator = Math.max(3, recentValues[Math.floor(recentValues.length * .9)] ?? 3);
      rows = rows.map(row => {
        const match = best.get(row.id), eyes = activity.get(row.id) ?? { lifetime: 0, recent: 0 };
        const eyeScore = 6 * Math.min(1, eyes.recent / denominator) + 4 * Math.min(1, Math.log1p(eyes.lifetime) / Math.log1p(50));
        const interestRelevance = canonicalTerm(profile?.industry) === canonicalTerm(row.industry) ? 1 : (profile?.interests ?? []).some(value => canonicalTerm(value) === canonicalTerm(row.industry)) ? .75 : .2;
        const exploration = match?.recommendation.tier === "exploration" && eyes.lifetime <= 2;
        const algorithmScore = match ? feedScore({ roleScore: match.recommendation.score, criticality: match.role.criticality, filled: match.role.filled, capacity: match.role.capacity, interestRelevance, eyeScore, ageHours: Math.max(0, (Date.now() - row.createdAt.getTime()) / 3_600_000), warmPath: Number(match.recommendation.componentScores.warmPath ?? 0) > 0, exploration, weights: { roleMatch: settings.weights.feedRoleMatch, urgency: settings.weights.feedUrgency, relevance: settings.weights.feedRelevance, eyes: settings.weights.feedEyes, freshness: settings.weights.feedFreshness, network: settings.weights.feedNetwork, exploration: settings.weights.feedExploration } }) : 0;
        return { ...row, matchScore: match?.recommendation.score, recommendationId: match?.recommendation.id, recommendationTier: match?.recommendation.tier, recommendationReasons: match?.recommendation.reasons, matchedRole: match?.role.title, feedScore: algorithmScore, eyeMomentum: Number(eyeScore.toFixed(2)) };
      });
      if (filter === "following") {
        const sharedOwnerIds = memberProjectIds.length ? new Set((await db.select({ userId: projectMembers.userId }).from(projectMembers).where(inArray(projectMembers.projectId, memberProjectIds))).map(item => item.userId)) : new Set<string>();
        const followedOwnerIds = new Set((await db.select({ userId:follows.followingId }).from(follows).where(eq(follows.followerId,viewerId))).map(item=>item.userId));
        rows = rows.filter(row => sharedOwnerIds.has(row.ownerId)||followedOwnerIds.has(row.ownerId)||row.isFollowingProject).sort((a, b) => Number(followedOwnerIds.has(b.ownerId))-Number(followedOwnerIds.has(a.ownerId))||Number(b.isFollowingProject)-Number(a.isFollowingProject)||b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));
      } else if (filter === "newest") rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));
      else if (settings.rolloutStage >= 2 && profile?.ageBand !== "teen_16_17") {
        rows = rows.filter(row => row.isPinned || (row.matchScore ?? 0) >= 45).sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (b.feedScore ?? 0) - (a.feedScore ?? 0) || b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));
        rows = enforceOwnerDiversity(rows);
        const explorationIndex = rows.findIndex((row, index) => index >= 10 && row.recommendationTier === "exploration");
        if (explorationIndex > 9) rows.splice(9, 0, rows.splice(explorationIndex, 1)[0]);
      } else rows.sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (b.eyeMomentum ?? 0) - (a.eyeMomentum ?? 0) || b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id));
      const algorithmMode = settings.rolloutStage >= 2 && profile?.ageBand !== "teen_16_17" ? "live" : "shadow";
      const start = cursor ? Math.max(0, rows.findIndex(row => row.id === cursor) + 1) : 0, page = rows.slice(start, start + limit);
      const impressions = page.filter(row => row.recommendationId).map(row => ({ recommendationId: row.recommendationId!, userId: viewerId, event: "impression", signalWeight: 0, metadata: { source: filter } }));
      if (impressions.length) after(() => db.insert(recommendationEvents).values(impressions).catch(() => undefined));
      return NextResponse.json({ projects: page, nextCursor: start + limit < rows.length ? page.at(-1)?.id : null, algorithmMode, algorithmVersion: settings.version });
    }
    return NextResponse.json({ projects: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1]?.id : null });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(), input = inputSchema.parse(await request.json()), db = getDb();
    let coOwnerInvitations: CoOwnerInvitationDelivery[] = [];
    const project = await db.transaction(async tx => {
      const { roles, coOwnerIds, ...projectInput } = input;
      const [created] = await tx.insert(projects).values({ ...projectInput, ownerId: member.id, location: [input.city, input.country].filter(Boolean).join(", ") || null }).returning();
      await tx.insert(projectMembers).values({ projectId: created.id, userId: member.id, membershipRole: "owner", department: "Leadership" });
      if (roles.length) await tx.insert(projectRoles).values(roles.map(role => ({ ...role, projectId: created.id, requiredSkills: role.requiredSkills.length ? role.requiredSkills : role.skills, reason: role.reason ?? role.description })));
      coOwnerInvitations = await createCoOwnerInvitations(tx, { projectId: created.id, ownerId: member.id, coOwnerIds });
      return created;
    });
    await recomputeProjectRecommendations(project.id);
    after(() => ensureProjectEmbedding(project.id).catch(() => undefined));
    after(() => createNotifications(coOwnerInvitations.map(invitation => ({ userId: invitation.inviteeId, actorId: member.id, type: "invitation", title: `${member.name ?? "An n2 member"} invited you to co-own a project`, body: project.title, entityType: "invitation", entityId: invitation.invitationId, href: `/invite/${invitation.token}` }))).catch(() => undefined));
    await audit(member.id, "project.created", "project", project.id, { roleCount: input.roles.length });
    await trackProductEvent({ actorId: member.id, event: "project_created", entityType: "project", entityId: project.id, properties: { industry: input.industry, stage: input.stage, roleCount: input.roles.length } });
    return NextResponse.json(project, { status: 201 });
  } catch (error) { return apiError(error); }
}
