import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { adminAssignments, privacySettings, projectRoles, projects, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";

export async function GET(request: Request) {
  try {
    const member = await requireMember();
    const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
    if (query.length < 2) return NextResponse.json({ people: [], projects: [], roles: [] });
    const db = getDb(), term = `%${query}%`;
    const [viewer] = await db.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, member.id)).limit(1);
    const discoverableAgeBands = viewer?.ageBand === "teen_16_17" ? ["teen_16_17"] : ["adult", "adult_18_24", "adult_25_plus"];
    const [people, projectRows, roles] = await Promise.all([
      db.select({ id: users.id, name: users.name, image: users.image, profession: users.profession, industry: users.industry, skills: users.skills, interests: users.interests, isN2Admin: sql<boolean>`case when ${adminAssignments.status} = 'active' then true else false end` })
        .from(users).leftJoin(privacySettings, eq(privacySettings.userId, users.id)).leftJoin(adminAssignments, eq(adminAssignments.userId, users.id))
        .where(and(ne(users.id, member.id), eq(users.status, "active"), inArray(users.ageBand, discoverableAgeBands), or(eq(privacySettings.profileVisibility, "network"), sql`${privacySettings.userId} is null`), or(ilike(users.name, term), ilike(users.profession, term), ilike(users.industry, term), sql`array_to_string(${users.skills}, ' ') ilike ${term}`, sql`array_to_string(${users.interests}, ' ') ilike ${term}`))).limit(8),
      db.select({ id: projects.id, title: projects.title, summary: projects.summary, industry: projects.industry, stage: projects.stage, accent: projects.accent, ownerName: users.name, createdAt: projects.createdAt })
        .from(projects).innerJoin(users, eq(users.id, projects.ownerId)).where(and(eq(projects.status, "active"), eq(projects.visibility, "network"), or(ilike(projects.title, term), ilike(projects.summary, term), ilike(projects.description, term), ilike(projects.industry, term)))).orderBy(desc(projects.createdAt)).limit(8),
      db.select({ id: projectRoles.id, projectId: projectRoles.projectId, title: projectRoles.title, department: projectRoles.department, skills: projectRoles.skills, projectTitle: projects.title })
        .from(projectRoles).innerJoin(projects, eq(projects.id, projectRoles.projectId)).where(and(eq(projectRoles.status, "open"), eq(projects.status, "active"), or(ilike(projectRoles.title, term), ilike(projectRoles.department, term), sql`array_to_string(${projectRoles.skills}, ' ') ilike ${term}`))).limit(8),
    ]);
    await trackProductEvent({ actorId: member.id, ageBand: viewer?.ageBand, event: "search_performed", properties: { result: people.length + projectRows.length + roles.length } });
    return NextResponse.json({ people, projects: projectRows, roles });
  } catch (error) { return apiError(error); }
}
