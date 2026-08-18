import { NextResponse } from "next/server";
import { and, eq, max, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { milestones, projectInvolvementRequests, projectMembers, projectRoles, projects, projectUpdates, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { requireProjectOwner } from "@/lib/project-access";

const schema = z.object({
  action: z.enum(["onboard", "decline"]),
  roleId: z.uuid().optional(),
  roleTitle: z.string().trim().min(2).max(100).optional(),
  department: z.string().trim().min(2).max(80).optional(),
  roadmapTitle: z.string().trim().min(3).max(120).optional(),
}).superRefine((value, context) => {
  if (value.action === "onboard" && !value.roleId && (!value.roleTitle || !value.department)) {
    context.addIssue({ code: "custom", message: "Choose an open role or enter a new project role" });
  }
});

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; requestId: string }> }) {
  try {
    const member = await requireMember(), { projectId, requestId } = await params, input = schema.parse(await request.json()), db = getDb();
    await requireProjectOwner(member.id, projectId);
    const [offer] = await db.select({ request: projectInvolvementRequests, userName: users.name, projectTitle: projects.title }).from(projectInvolvementRequests).innerJoin(users, eq(users.id, projectInvolvementRequests.userId)).innerJoin(projects, eq(projects.id, projectInvolvementRequests.projectId)).where(and(eq(projectInvolvementRequests.id, requestId), eq(projectInvolvementRequests.projectId, projectId))).limit(1);
    if (!offer) throw new ApiError(404, "Offer not found");
    if (offer.request.status !== "pending") throw new ApiError(409, "This offer has already been reviewed");

    let assignedRoleTitle = input.roleTitle ?? "Project contributor";
    await db.transaction(async tx => {
      if (input.action === "decline") {
        await tx.update(projectInvolvementRequests).set({ status: "declined", updatedAt: new Date() }).where(eq(projectInvolvementRequests.id, requestId));
        return;
      }
      const [existingMember] = await tx.select({ userId: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, offer.request.userId))).limit(1);
      if (existingMember) throw new ApiError(409, "This person is already on the project team");

      let roleId = input.roleId;
      let department = input.department ?? "General";
      if (roleId) {
        const [role] = await tx.select().from(projectRoles).where(and(eq(projectRoles.id, roleId), eq(projectRoles.projectId, projectId), eq(projectRoles.status, "open"))).limit(1);
        if (!role || role.filled >= role.capacity) throw new ApiError(400, "Choose an available project role");
        assignedRoleTitle = role.title;
        department = role.department;
        await tx.update(projectRoles).set({ filled: sql`least(${projectRoles.capacity}, ${projectRoles.filled} + 1)` }).where(eq(projectRoles.id, role.id));
      } else {
        const [role] = await tx.insert(projectRoles).values({
          projectId,
          title: input.roleTitle!,
          department: input.department!,
          description: `Created while onboarding ${offer.userName ?? "a new contributor"}.`,
          reason: offer.request.message,
          skills: offer.request.services,
          requiredSkills: offer.request.services.length ? offer.request.services : ["Project contribution"],
          usefulSkills: [],
          capacity: 1,
          filled: 1,
          status: "filled",
        }).returning();
        roleId = role.id;
        assignedRoleTitle = role.title;
      }
      await tx.insert(projectMembers).values({ projectId, userId: offer.request.userId, roleId, department });
      await tx.update(projectInvolvementRequests).set({ status: "accepted", updatedAt: new Date() }).where(eq(projectInvolvementRequests.id, requestId));
      await tx.insert(projectUpdates).values({ projectId, authorId: offer.request.userId, type: "member_joined", body: `${offer.userName ?? "A new member"} joined as ${assignedRoleTitle}.` });
      if (input.roadmapTitle) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${projectId}))`);
        const [position] = await tx.select({ value: max(milestones.sortOrder) }).from(milestones).where(eq(milestones.projectId, projectId));
        const [milestone] = await tx.insert(milestones).values({ projectId, title: input.roadmapTitle, phase: "now", ownerId: offer.request.userId, status: "planned", sortOrder: (position.value ?? -1) + 1 }).returning();
        await tx.insert(projectUpdates).values({ projectId, milestoneId: milestone.id, authorId: member.id, type: "milestone_created", body: `Added roadmap step: ${input.roadmapTitle}` });
      }
    });

    await createNotification({ userId: offer.request.userId, actorId: member.id, type: "project", title: input.action === "onboard" ? `Welcome to ${offer.projectTitle}` : `Your offer for ${offer.projectTitle} was reviewed`, body: input.action === "onboard" ? `You joined as ${assignedRoleTitle}.` : "The project team is not moving forward with this offer right now.", entityType: "project", entityId: projectId, href: `/?view=projects&project=${projectId}` });
    await audit(member.id, `project.involvement_${input.action}`, "project", projectId, { requestId, roleId: input.roleId, roadmapTitle: input.roadmapTitle });
    return NextResponse.json({ status: input.action === "onboard" ? "accepted" : "declined", roleTitle: assignedRoleTitle });
  } catch (error) { return apiError(error); }
}
