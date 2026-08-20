import { and, asc, count, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { adminAssignments, careerHistory, educationHistory, follows, postLikes, postReplies, postReposts, privacySettings, projectMembers, projects, timelinePosts, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { after } from "next/server";
import { recomputeMemberRecommendations } from "@/lib/recommendations/service";
import { sanitizeRichText } from "@/lib/rich-text";
import { canonicalIndustry, canonicalProfession, isMeaningfulOtherHeadline, OTHER_PROFESSION } from "@/lib/professional-profile";
import { getPlatformSettings } from "@/lib/platform-settings";
import { isAvailableUsernameFormat } from "@/lib/usernames";
import { isTemporarilyUnavailable } from "@/lib/member-identity";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().toLowerCase().refine(isAvailableUsernameFormat, "Use 3–30 lowercase letters, numbers, underscores or hyphens. The username cannot be a reserved n2 page."),
  image: z.string().max(900_000).refine(value => !value || /^data:image\/(jpeg|png|webp);base64,/i.test(value)).nullable().optional(),
  coverImage: z.string().max(1_500_000).refine(value => !value || /^data:image\/(jpeg|png|webp);base64,/i.test(value)).nullable().optional(),
  headline: z.string().trim().max(160).nullable().optional(),
  profession: z.string().trim().max(100).nullable().optional(),
  industry: z.string().trim().max(100).nullable().optional(),
  bio: z.string().trim().max(1500).nullable().optional(),
  primarySkill: z.string().trim().min(1).max(80),
  secondarySkill: z.string().trim().min(1).max(80),
  tertiarySkill: z.string().trim().min(1).max(80),
  interests: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  location: z.string().trim().max(160).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(), country: z.string().trim().max(100).nullable().optional(),
  timezone: z.string().trim().min(3).max(80).default("Europe/London"), workMode: z.enum(["remote", "hybrid", "in_person"]).default("remote"),
  career: z.array(z.object({ id: z.uuid().optional(), title: z.string().trim().min(1).max(120), company: z.string().trim().min(1).max(120), location: z.string().trim().max(120).nullable().optional(), startDate: z.string().date().nullable().optional(), endDate: z.string().date().nullable().optional(), current: z.boolean().default(false), description: z.string().trim().max(6000).nullable().optional() })).max(20).default([]),
  education: z.array(z.object({ id: z.uuid().optional(), institution: z.string().trim().min(1).max(160), qualification: z.string().trim().min(1).max(160), fieldOfStudy: z.string().trim().max(160).nullable().optional(), startYear: z.number().int().min(1940).max(2100).nullable().optional(), endYear: z.number().int().min(1940).max(2100).nullable().optional(), description: z.string().trim().max(1000).nullable().optional() })).max(20).default([]),
});
const profilePatchSchema = profileSchema.partial().refine(
  input => Object.keys(input).length > 0,
  "Choose at least one profile field to update.",
);

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const viewer = await requireMember(), { userId } = await params, db = getDb();
    const [row] = await db.select({ id: users.id, username: users.username, name: users.name, image: users.image, coverImage: users.coverImage, profession: users.profession, headline: users.headline, bio: users.bio, industry: users.industry, primarySkill: users.primarySkill, secondarySkill: users.secondarySkill, tertiarySkill: users.tertiarySkill, skills: users.skills, interests: users.interests, location: users.location, city: users.city, country: users.country, timezone: users.timezone, workMode: users.workMode, ageBand: users.ageBand, status: users.status, visibility: privacySettings.profileVisibility, showLocation: privacySettings.showLocation, isN2Admin: adminAssignments.id, isFounder: sql<boolean>`${users.role} = 'founder'`, isDemo: sql<boolean>`${users.role} = 'demo_member'` })
      .from(users).leftJoin(privacySettings, eq(privacySettings.userId, users.id)).leftJoin(adminAssignments, and(eq(adminAssignments.userId, users.id), eq(adminAssignments.status, "active"))).where(eq(users.id, userId)).limit(1);
    if (!row) throw new ApiError(404, "Profile not found");
    if (row.status === "deactivated" || isTemporarilyUnavailable(row.status)) return NextResponse.json({ profile: {
      id: row.id, username: row.username, name: isTemporarilyUnavailable(row.status) ? "Unavailable member" : row.name, image: null, coverImage: null,
      profession: null, headline: null, bio: null, industry: null, rankedSkills: [], interests: [], location: null,
      status: row.status, deactivated: true, unavailable: isTemporarilyUnavailable(row.status), isN2Admin: false, isFounder: false, isDemo: false, isCurrent: false,
      projectCount: 0, involvedCount: 0, followers: 0, following: 0, isFollowing: false, isMutual: false,
      posts: [], projects: [], career: [], education: [],
    } }, { headers: { "Cache-Control": "private, no-store" } });
    if (row.status !== "active") throw new ApiError(404, "Profile not found");
    const isCurrent = viewer.id === userId;
    const profileTaxonomySafeguardsEnabled = isCurrent ? (await getPlatformSettings()).profileTaxonomySafeguardsEnabled : undefined;
    if (!isCurrent && (row.visibility === "private" || row.visibility === "connections")) {
      const directions=await db.select({followerId:follows.followerId,followingId:follows.followingId}).from(follows).where(or(and(eq(follows.followerId,viewer.id),eq(follows.followingId,userId)),and(eq(follows.followerId,userId),eq(follows.followingId,viewer.id))));
      const viewerFollows=directions.some(item=>item.followerId===viewer.id);
      const mutual=viewerFollows&&directions.some(item=>item.followerId===userId);
      if(row.visibility === "private"&&!viewerFollows)throw new ApiError(403,"This profile is private. Request to follow this member first.");
      if(row.visibility === "connections"&&!mutual)throw new ApiError(403,"This profile is visible to mutual connections");
    }
    const projectVisibility = isCurrent ? undefined : and(eq(projects.visibility, "network"), eq(projects.status, "active"));
    const postVisibility = isCurrent
      ? or(eq(timelinePosts.visibility, "network"), eq(timelinePosts.visibility, "connections"))
      : eq(timelinePosts.visibility, "network");
    const [career, education, ownedProjects, joinedProjects, profilePosts, followerCount, followingCount, viewerFollow, targetFollow] = await Promise.all([
      db.select().from(careerHistory).where(eq(careerHistory.userId, userId)).orderBy(asc(careerHistory.sortOrder)),
      db.select().from(educationHistory).where(eq(educationHistory.userId, userId)).orderBy(asc(educationHistory.sortOrder)),
      db.select({ id:projects.id,title:projects.title,summary:projects.summary,industry:projects.industry,stage:projects.stage,status:projects.status,accent:projects.accent,createdAt:projects.createdAt }).from(projects).where(projectVisibility?and(eq(projects.ownerId,userId),ne(projects.status,"deleted"),projectVisibility):and(eq(projects.ownerId,userId),ne(projects.status,"deleted"))).orderBy(asc(projects.title)),
      db.select({ id:projects.id,title:projects.title,summary:projects.summary,industry:projects.industry,stage:projects.stage,status:projects.status,accent:projects.accent,createdAt:projects.createdAt,membershipRole:projectMembers.membershipRole,department:projectMembers.department }).from(projectMembers).innerJoin(projects,eq(projects.id,projectMembers.projectId)).where(projectVisibility?and(eq(projectMembers.userId,userId),ne(projects.ownerId,userId),ne(projects.status,"deleted"),projectVisibility):and(eq(projectMembers.userId,userId),ne(projects.ownerId,userId),ne(projects.status,"deleted"))).orderBy(asc(projects.title)),
      db.select({
        id: timelinePosts.id, body: timelinePosts.body, linkedProjectIds: timelinePosts.linkedProjectIds,
        attachmentType: timelinePosts.attachmentType, attachmentUrl: timelinePosts.attachmentUrl, videoUrl: timelinePosts.videoUrl,
        visibility: timelinePosts.visibility, createdAt: timelinePosts.createdAt,
        replyCount: sql<number>`(select count(*)::int from ${postReplies} where ${postReplies.postId} = ${timelinePosts.id} and ${postReplies.status} = 'visible')`,
        likeCount: sql<number>`(select count(*)::int from ${postLikes} where ${postLikes.postId} = ${timelinePosts.id})`,
        repostCount: sql<number>`(select count(*)::int from ${postReposts} where ${postReposts.postId} = ${timelinePosts.id})`,
        liked: sql<boolean>`exists(select 1 from ${postLikes} where ${postLikes.postId} = ${timelinePosts.id} and ${postLikes.userId} = ${viewer.id})`,
        reposted: sql<boolean>`exists(select 1 from ${postReposts} where ${postReposts.postId} = ${timelinePosts.id} and ${postReposts.userId} = ${viewer.id})`,
      }).from(timelinePosts).where(and(eq(timelinePosts.authorId, userId), eq(timelinePosts.status, "visible"), postVisibility)).orderBy(desc(timelinePosts.createdAt)).limit(100),
      db.select({value:count()}).from(follows).where(eq(follows.followingId,userId)),
      db.select({value:count()}).from(follows).where(eq(follows.followerId,userId)),
      db.select({id:follows.followerId}).from(follows).where(and(eq(follows.followerId,viewer.id),eq(follows.followingId,userId))).limit(1),
      db.select({id:follows.followerId}).from(follows).where(and(eq(follows.followerId,userId),eq(follows.followingId,viewer.id))).limit(1),
    ]);
    const rankedSkills = [row.primarySkill, row.secondarySkill, row.tertiarySkill].filter(Boolean);
    const fallbackSkills = rankedSkills.length ? rankedSkills : row.skills.slice(0, 3);
    const projectHistory=[...ownedProjects.map(project=>({...project,isOwner:true,membershipRole:"owner",department:"Leadership"})),...joinedProjects.map(project=>({...project,isOwner:false}))];
    const linkedProjectIds = [...new Set(profilePosts.flatMap(post => post.linkedProjectIds))];
    const linkedProjects = linkedProjectIds.length
      ? await db.select({ id: projects.id, title: projects.title }).from(projects).where(and(inArray(projects.id, linkedProjectIds), eq(projects.status, "active"), eq(projects.visibility, "network")))
      : [];
    const linkedProjectById = new Map(linkedProjects.map(project => [project.id, project]));
    return NextResponse.json(
      { profile: { ...row, deactivated: false, location: isCurrent || row.showLocation ? row.location : null, isN2Admin: Boolean(row.isN2Admin), rankedSkills: fallbackSkills, career, education, projects:projectHistory, posts:profilePosts.map(post => ({ ...post, authorId: row.id, authorName: row.name, authorImage: row.image, authorProfession: row.profession, authorStatus: row.status, authorIsAdmin: Boolean(row.isN2Admin), isDemo: row.isDemo, linkedProjects: post.linkedProjectIds.map(id => linkedProjectById.get(id)).filter(Boolean) })), projectCount:ownedProjects.length, involvedCount:joinedProjects.length, followers:followerCount[0]?.value??0,following:followingCount[0]?.value??0,isFollowing:Boolean(viewerFollow[0]),isMutual:Boolean(viewerFollow[0]&&targetFollow[0]),isCurrent, profileTaxonomySafeguardsEnabled } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) { return apiError(error); }
}

async function updateProfile(
  request: Request,
  params: Promise<{ userId: string }>,
  partial: boolean,
) {
  try {
    const viewer = await requireMember(), { userId } = await params;
    if (viewer.id !== userId) throw new ApiError(403, "You can only edit your own profile");
    const input = (partial ? profilePatchSchema : profileSchema).parse(await request.json()), db = getDb();
    const [current] = await db.select({
      username: users.username,
      profession: users.profession,
      headline: users.headline,
      industry: users.industry,
      primarySkill: users.primarySkill,
      secondarySkill: users.secondarySkill,
      tertiarySkill: users.tertiarySkill,
      city: users.city,
      country: users.country,
    }).from(users).where(eq(users.id, userId)).limit(1);
    if (!current) throw new ApiError(404, "Profile not found");
    const { profileTaxonomySafeguardsEnabled } = await getPlatformSettings();
    if (profileTaxonomySafeguardsEnabled) {
      if (input.profession !== undefined) {
        const canonical = typeof input.profession === "string" ? canonicalProfession(input.profession) : null;
        if (!canonical) throw new ApiError(400, "Choose a profession from the list.");
        input.profession = canonical;
      }
      if (input.industry !== undefined) {
        const canonical = typeof input.industry === "string" ? canonicalIndustry(input.industry) : null;
        if (!canonical) throw new ApiError(400, "Choose an industry from the list.");
        input.industry = canonical;
      }
      const effectiveProfession = input.profession ?? current.profession;
      const headlineIsProtected = input.profession !== undefined || (input.headline !== undefined && effectiveProfession === OTHER_PROFESSION);
      if (headlineIsProtected && effectiveProfession === OTHER_PROFESSION) {
        const effectiveHeadline = input.headline ?? current.headline ?? "";
        if (!isMeaningfulOtherHeadline(effectiveHeadline)) throw new ApiError(400, "Describe your unlisted profession using at least two meaningful words.");
      }
    }
    if (input.username !== undefined && input.username !== current.username) {
      const [usernameOwner] = await db.select({ id: users.id }).from(users).where(and(eq(users.username, input.username), ne(users.id, userId))).limit(1);
      if (usernameOwner) throw new ApiError(409, "That username is already taken. Choose another one.");
    }
    const userChanges: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    const scalarFields = ["username", "name", "image", "coverImage", "headline", "profession", "industry", "bio", "primarySkill", "secondarySkill", "tertiarySkill", "interests", "location", "city", "country", "timezone", "workMode"] as const;
    for (const field of scalarFields) {
      if (input[field] !== undefined) Object.assign(userChanges, { [field]: input[field] });
    }
    if (input.primarySkill !== undefined || input.secondarySkill !== undefined || input.tertiarySkill !== undefined) {
      userChanges.skills = [
        input.primarySkill ?? current.primarySkill,
        input.secondarySkill ?? current.secondarySkill,
        input.tertiarySkill ?? current.tertiarySkill,
      ].filter((skill): skill is string => Boolean(skill));
    }
    if (input.location === undefined && (input.city !== undefined || input.country !== undefined)) {
      userChanges.location = [input.city ?? current.city, input.country ?? current.country].filter(Boolean).join(", ") || null;
    }
    await db.transaction(async tx => {
      await tx.update(users).set(userChanges).where(eq(users.id, userId));
      if (input.career !== undefined) {
        await tx.delete(careerHistory).where(eq(careerHistory.userId, userId));
        if (input.career.length) await tx.insert(careerHistory).values(input.career.map((item, sortOrder) => ({ ...item, description: sanitizeRichText(item.description) || null, id: undefined, userId, startDate: item.startDate ?? null, endDate: item.current ? null : item.endDate ?? null, sortOrder })));
      }
      if (input.education !== undefined) {
        await tx.delete(educationHistory).where(eq(educationHistory.userId, userId));
        if (input.education.length) await tx.insert(educationHistory).values(input.education.map((item, sortOrder) => ({ ...item, id: undefined, userId, sortOrder })));
      }
    });
    await audit(viewer.id, "profile.updated", "user", userId);
    after(() => recomputeMemberRecommendations(userId));
    const username = input.username ?? current.username;
    return NextResponse.json({ success: true, username, publicProfilePath: `/${username}` });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  return updateProfile(request, params, true);
}

export async function PUT(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  return updateProfile(request, params, false);
}
