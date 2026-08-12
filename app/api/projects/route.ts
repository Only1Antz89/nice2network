import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { adminAssignments, projectEyes, projectMembers, projectRoles, projects, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { trackProductEvent } from "@/lib/analytics";
import { createNotifications } from "@/lib/notifications";

const inputSchema=z.object({title:z.string().trim().min(4).max(120),summary:z.string().trim().min(20).max(300),description:z.string().max(5000).optional(),industry:z.string().min(2).max(80),stage:z.enum(["idea","planning","building","launching"]).default("idea"),visibility:z.enum(["network","connections","private"]).default("network"),roles:z.array(z.object({title:z.string().min(2).max(80),department:z.string().min(2).max(80),description:z.string().max(500).optional(),skills:z.array(z.string().max(50)).max(12).default([])})).max(12).default([])});

export async function GET(request: Request) {
  try {
    const member = await requireMember(), db = getDb(), scope = new URL(request.url).searchParams.get("scope") ?? "discover";
    const memberships = await db.select({ projectId: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.userId, member.id));
    const memberProjectIds = memberships.map(row => row.projectId);
    const condition = scope === "mine"
      ? or(eq(projects.ownerId, member.id), memberProjectIds.length ? inArray(projects.id, memberProjectIds) : eq(projects.ownerId, member.id))
      : and(eq(projects.status, "active"), eq(projects.visibility, "network"));
    const rows = await db.select({ id: projects.id, title: projects.title, summary: projects.summary, description: projects.description, industry: projects.industry, stage: projects.stage, status: projects.status, accent: projects.accent, ownerId: projects.ownerId, ownerName: users.name, ownerImage: users.image, ownerIsAdmin: sql<boolean>`case when ${adminAssignments.status} = 'active' then true else false end`, eyeCount: count(projectEyes.userId), createdAt: projects.createdAt })
      .from(projects).innerJoin(users, eq(users.id, projects.ownerId)).leftJoin(adminAssignments, and(eq(adminAssignments.userId, projects.ownerId), eq(adminAssignments.status, "active"))).leftJoin(projectEyes, eq(projectEyes.projectId, projects.id)).where(condition).groupBy(projects.id, users.id, adminAssignments.status).orderBy(desc(projects.createdAt)).limit(50);
    return NextResponse.json({ projects: rows });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(), input = inputSchema.parse(await request.json()), db = getDb();
    const project = await db.transaction(async tx => {
      const [created] = await tx.insert(projects).values({ ...input, ownerId: member.id }).returning();
      await tx.insert(projectMembers).values({ projectId: created.id, userId: member.id, membershipRole: "owner", department: "Leadership" });
      if (input.roles.length) await tx.insert(projectRoles).values(input.roles.map(role => ({ ...role, projectId: created.id })));
      return created;
    });
    const candidates = await db.select({ id: users.id, skills: users.skills, industry: users.industry }).from(users).where(and(eq(users.status, "active"), sql`${users.id} <> ${member.id}`, inArray(users.ageBand, ["adult", "adult_18_24", "adult_25_plus"]))).limit(80);
    const roleSkills = input.roles.flatMap(role => role.skills.map(skill => skill.toLowerCase()));
    const matched = candidates.filter(candidate => candidate.industry?.toLowerCase() === input.industry.toLowerCase() || candidate.skills.some(skill => roleSkills.includes(skill.toLowerCase()))).slice(0, 20);
    await createNotifications(matched.map(candidate => ({ userId: candidate.id, actorId: member.id, type: "match" as const, title: "A new project may fit your skills", body: project.title, entityType: "project", entityId: project.id, href: `/?project=${project.id}` })));
    await audit(member.id, "project.created", "project", project.id, { roleCount: input.roles.length });
    await trackProductEvent({ actorId: member.id, event: "project_created", entityType: "project", entityId: project.id, properties: { industry: input.industry, stage: input.stage, roleCount: input.roles.length } });
    return NextResponse.json(project, { status: 201 });
  } catch (error) { return apiError(error); }
}
