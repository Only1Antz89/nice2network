import { and, asc, count, eq, ne, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { adminAssignments, careerHistory, educationHistory, follows, privacySettings, projectMembers, projects, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { after } from "next/server";
import { recomputeMemberRecommendations } from "@/lib/recommendations/service";
import { sanitizeRichText } from "@/lib/rich-text";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
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
  city: z.string().trim().max(100).nullable().optional(), country: z.string().trim().max(100).nullable().optional(),
  timezone: z.string().trim().min(3).max(80).default("Europe/London"), workMode: z.enum(["remote", "hybrid", "in_person"]).default("remote"),
  career: z.array(z.object({ id: z.uuid().optional(), title: z.string().trim().min(1).max(120), company: z.string().trim().min(1).max(120), location: z.string().trim().max(120).nullable().optional(), startDate: z.string().date().nullable().optional(), endDate: z.string().date().nullable().optional(), current: z.boolean().default(false), description: z.string().trim().max(6000).nullable().optional() })).max(20).default([]),
  education: z.array(z.object({ id: z.uuid().optional(), institution: z.string().trim().min(1).max(160), qualification: z.string().trim().min(1).max(160), fieldOfStudy: z.string().trim().max(160).nullable().optional(), startYear: z.number().int().min(1940).max(2100).nullable().optional(), endYear: z.number().int().min(1940).max(2100).nullable().optional(), description: z.string().trim().max(1000).nullable().optional() })).max(20).default([]),
});

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const viewer = await requireMember(), { userId } = await params, db = getDb();
    const [row] = await db.select({ id: users.id, name: users.name, image: users.image, coverImage: users.coverImage, profession: users.profession, headline: users.headline, bio: users.bio, industry: users.industry, primarySkill: users.primarySkill, secondarySkill: users.secondarySkill, tertiarySkill: users.tertiarySkill, skills: users.skills, interests: users.interests, location: users.location, city: users.city, country: users.country, timezone: users.timezone, workMode: users.workMode, ageBand: users.ageBand, visibility: privacySettings.profileVisibility, showLocation: privacySettings.showLocation, isN2Admin: adminAssignments.id, isFounder: sql<boolean>`${users.role} = 'founder'`, isDemo: sql<boolean>`${users.role} = 'demo_member'` })
      .from(users).leftJoin(privacySettings, eq(privacySettings.userId, users.id)).leftJoin(adminAssignments, and(eq(adminAssignments.userId, users.id), eq(adminAssignments.status, "active"))).where(and(eq(users.id, userId), eq(users.status, "active"))).limit(1);
    if (!row) throw new ApiError(404, "Profile not found");
    const isCurrent = viewer.id === userId;
    if (!isCurrent && row.visibility === "private") throw new ApiError(403, "This profile is private");
    if (!isCurrent && row.visibility === "connections") {
      const directions=await db.select({followerId:follows.followerId,followingId:follows.followingId}).from(follows).where(or(and(eq(follows.followerId,viewer.id),eq(follows.followingId,userId)),and(eq(follows.followerId,userId),eq(follows.followingId,viewer.id))));
      const mutual=directions.some(item=>item.followerId===viewer.id)&&directions.some(item=>item.followerId===userId);
      if(!mutual)throw new ApiError(403,"This profile is visible to mutual connections");
    }
    const projectVisibility = isCurrent ? undefined : eq(projects.visibility, "network");
    const [career, education, ownedProjects, joinedProjects, followerCount, followingCount, viewerFollow, targetFollow] = await Promise.all([
      db.select().from(careerHistory).where(eq(careerHistory.userId, userId)).orderBy(asc(careerHistory.sortOrder)),
      db.select().from(educationHistory).where(eq(educationHistory.userId, userId)).orderBy(asc(educationHistory.sortOrder)),
      db.select({ id:projects.id,title:projects.title,summary:projects.summary,industry:projects.industry,stage:projects.stage,status:projects.status,accent:projects.accent,createdAt:projects.createdAt }).from(projects).where(projectVisibility?and(eq(projects.ownerId,userId),projectVisibility):eq(projects.ownerId,userId)).orderBy(asc(projects.title)),
      db.select({ id:projects.id,title:projects.title,summary:projects.summary,industry:projects.industry,stage:projects.stage,status:projects.status,accent:projects.accent,createdAt:projects.createdAt,membershipRole:projectMembers.membershipRole,department:projectMembers.department }).from(projectMembers).innerJoin(projects,eq(projects.id,projectMembers.projectId)).where(projectVisibility?and(eq(projectMembers.userId,userId),ne(projects.ownerId,userId),projectVisibility):and(eq(projectMembers.userId,userId),ne(projects.ownerId,userId))).orderBy(asc(projects.title)),
      db.select({value:count()}).from(follows).where(eq(follows.followingId,userId)),
      db.select({value:count()}).from(follows).where(eq(follows.followerId,userId)),
      db.select({id:follows.followerId}).from(follows).where(and(eq(follows.followerId,viewer.id),eq(follows.followingId,userId))).limit(1),
      db.select({id:follows.followerId}).from(follows).where(and(eq(follows.followerId,userId),eq(follows.followingId,viewer.id))).limit(1),
    ]);
    const rankedSkills = [row.primarySkill, row.secondarySkill, row.tertiarySkill].filter(Boolean);
    const fallbackSkills = rankedSkills.length ? rankedSkills : row.skills.slice(0, 3);
    const projectHistory=[...ownedProjects.map(project=>({...project,isOwner:true,membershipRole:"owner",department:"Leadership"})),...joinedProjects.map(project=>({...project,isOwner:false}))];
    return NextResponse.json(
      { profile: { ...row, location: isCurrent || row.showLocation ? row.location : null, isN2Admin: Boolean(row.isN2Admin), rankedSkills: fallbackSkills, career, education, projects:projectHistory, projectCount:ownedProjects.length, involvedCount:joinedProjects.length, followers:followerCount[0]?.value??0,following:followingCount[0]?.value??0,isFollowing:Boolean(viewerFollow[0]),isMutual:Boolean(viewerFollow[0]&&targetFollow[0]),isCurrent } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const viewer = await requireMember(), { userId } = await params;
    if (viewer.id !== userId) throw new ApiError(403, "You can only edit your own profile");
    const input = profileSchema.parse(await request.json()), db = getDb();
    await db.transaction(async tx => {
      await tx.update(users).set({ name: input.name, image: input.image, coverImage: input.coverImage, headline: input.headline, profession: input.profession, industry: input.industry, bio: input.bio, primarySkill: input.primarySkill, secondarySkill: input.secondarySkill, tertiarySkill: input.tertiarySkill, skills: [input.primarySkill, input.secondarySkill, input.tertiarySkill], interests: input.interests, city: input.city, country: input.country, timezone: input.timezone, workMode: input.workMode, location: [input.city, input.country].filter(Boolean).join(", ") || null, updatedAt: new Date() }).where(eq(users.id, userId));
      await tx.delete(careerHistory).where(eq(careerHistory.userId, userId));
      if (input.career.length) await tx.insert(careerHistory).values(input.career.map((item, sortOrder) => ({ ...item, description: sanitizeRichText(item.description) || null, id: undefined, userId, startDate: item.startDate ?? null, endDate: item.current ? null : item.endDate ?? null, sortOrder })));
      await tx.delete(educationHistory).where(eq(educationHistory.userId, userId));
      if (input.education.length) await tx.insert(educationHistory).values(input.education.map((item, sortOrder) => ({ ...item, id: undefined, userId, sortOrder })));
    });
    await audit(viewer.id, "profile.updated", "user", userId);
    after(() => recomputeMemberRecommendations(userId));
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
