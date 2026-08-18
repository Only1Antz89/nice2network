import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { adminAssignments, follows, privacySettings, projectMembers, projectRoles, projects, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";
import { getMessageEligibility } from "@/lib/messaging-permissions";

export async function GET(request: Request) {
  try {
    const member = await requireMember();
    const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
    if (query.length < 2) return NextResponse.json({ people: [], projects: [], roles: [] });
    const db = getDb(), term = `%${query}%`;
    const [viewer] = await db.select({ ageBand: users.ageBand, isN2Admin: sql<boolean>`case when ${adminAssignments.status} = 'active' then true else false end` }).from(users).leftJoin(adminAssignments, eq(adminAssignments.userId, users.id)).where(eq(users.id, member.id)).limit(1);
    const discoverableAgeBands = viewer?.ageBand === "teen_16_17" ? ["teen_16_17"] : ["adult", "adult_18_24", "adult_25_plus"];
    const isFollowing=sql<boolean>`exists(select 1 from ${follows} mine where mine.follower_id=${member.id} and mine.following_id=${users.id})`,followsViewer=sql<boolean>`exists(select 1 from ${follows} back where back.follower_id=${users.id} and back.following_id=${member.id})`,sharesProject=sql<boolean>`exists(select 1 from ${projectMembers} mine join ${projectMembers} theirs on theirs.project_id=mine.project_id where mine.user_id=${member.id} and theirs.user_id=${users.id})`;
    const [people, projectRows, roles] = await Promise.all([
      db.select({ id: users.id, username: users.username, name: users.name, image: users.image, profession: users.profession, industry: users.industry, primarySkill: users.primarySkill, secondarySkill: users.secondarySkill, tertiarySkill: users.tertiarySkill, skills: users.skills, interests: users.interests, messagePermission: privacySettings.messagePermission, isFollowing, followsViewer, sharesProject, isN2Admin: sql<boolean>`case when ${adminAssignments.status} = 'active' then true else false end`, isDemo: sql<boolean>`${users.role} = 'demo_member'` })
        .from(users).leftJoin(privacySettings, eq(privacySettings.userId, users.id)).leftJoin(adminAssignments, eq(adminAssignments.userId, users.id))
        .where(and(ne(users.id, member.id), eq(users.status, "active"), inArray(users.ageBand, discoverableAgeBands), or(eq(privacySettings.profileVisibility, "network"), sql`${privacySettings.userId} is null`), or(ilike(users.username, term), ilike(users.name, term), ilike(users.profession, term), ilike(users.industry, term), ilike(users.primarySkill, term), ilike(users.secondarySkill, term), ilike(users.tertiarySkill, term), sql`array_to_string(${users.skills}, ' ') ilike ${term}`, sql`array_to_string(${users.interests}, ' ') ilike ${term}`))).orderBy(sql`${isFollowing} desc`,sql`(${isFollowing} and ${followsViewer}) desc`,sql`${sharesProject} desc`,users.name).limit(8),
      db.select({ id: projects.id, title: projects.title, summary: projects.summary, industry: projects.industry, stage: projects.stage, accent: projects.accent, ownerName: users.name, createdAt: projects.createdAt, isDemo: sql<boolean>`${users.role} = 'demo_member'` })
        .from(projects).innerJoin(users, eq(users.id, projects.ownerId)).where(and(eq(projects.status, "active"), eq(projects.visibility, "network"), or(ilike(projects.title, term), ilike(projects.summary, term), ilike(projects.description, term), ilike(projects.industry, term)))).orderBy(desc(projects.createdAt)).limit(8),
      db.select({ id: projectRoles.id, projectId: projectRoles.projectId, title: projectRoles.title, department: projectRoles.department, skills: projectRoles.skills, projectTitle: projects.title })
        .from(projectRoles).innerJoin(projects, eq(projects.id, projectRoles.projectId)).where(and(eq(projectRoles.status, "open"), eq(projects.status, "active"), or(ilike(projectRoles.title, term), ilike(projectRoles.department, term), sql`array_to_string(${projectRoles.skills}, ' ') ilike ${term}`))).limit(8),
    ]);
    await trackProductEvent({ actorId: member.id, ageBand: viewer?.ageBand, event: "search_performed", properties: { result: people.length + projectRows.length + roles.length } });
    return NextResponse.json({ people: people.map(person=>{const mutual=Boolean(person.isFollowing&&person.followsViewer),shared=Boolean(person.sharesProject),eligibility=getMessageEligibility({permission:person.messagePermission,sharedProject:shared,mutual,senderIsAdmin:Boolean(viewer?.isN2Admin),recipientIsAdmin:Boolean(person.isN2Admin)});return {...person,isMutual:mutual,canMessage:eligibility.canMessage,messageReason:eligibility.canMessage?eligibility.reason:person.isFollowing&&eligibility.reason==="Connect with each other first"?"Waiting for follow-back":eligibility.reason}}), projects: projectRows, roles });
  } catch (error) { return apiError(error); }
}
