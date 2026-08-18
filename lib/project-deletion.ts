import "server-only";
import { and, eq, lte, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { milestones, projectFollows, projectFundingInterests, projectMembers, projectRoles, projects } from "@/db/schema";
import { audit } from "@/lib/audit";
import { createNotifications } from "@/lib/notifications";

export type ProjectDeletionPlan = {
  immediate: boolean;
  delayHours: 0 | 24 | 48 | 72;
  deadline: Date;
  signals: { fullTeam: boolean; roadmapMature: boolean; hasFunding: boolean };
  facts: { ageHours: number; nonOwnerMembers: number; followers: number; completedMilestones: number; fundingInterests: number };
  explanation: string[];
};

export async function calculateProjectDeletion(projectId: string, now = new Date()): Promise<ProjectDeletionPlan | null> {
  const db = getDb();
  const [project] = await db.select({ id: projects.id, ownerId: projects.ownerId, createdAt: projects.createdAt }).from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return null;
  const [roles, members, followers, completed, funding] = await Promise.all([
    db.select({ capacity: projectRoles.capacity, filled: projectRoles.filled }).from(projectRoles).where(and(eq(projectRoles.projectId, projectId), eq(projectRoles.status, "open"))),
    db.select({ userId: projectMembers.userId }).from(projectMembers).where(and(eq(projectMembers.projectId, projectId), ne(projectMembers.userId, project.ownerId))),
    db.select({ userId: projectFollows.userId }).from(projectFollows).where(eq(projectFollows.projectId, projectId)),
    db.select({ id: milestones.id }).from(milestones).where(and(eq(milestones.projectId, projectId), eq(milestones.status, "completed"))),
    db.select({ id: projectFundingInterests.id }).from(projectFundingInterests).where(eq(projectFundingInterests.projectId, projectId)),
  ]);
  const ageHours = Math.max(0, (now.getTime() - project.createdAt.getTime()) / 3_600_000);
  const signals = {
    fullTeam: roles.length > 0 && roles.every(role => role.filled >= role.capacity),
    roadmapMature: completed.length >= 2,
    hasFunding: funding.length > 0,
  };
  const immediatelyEligible = ageHours < 24 || (members.length === 0 && followers.length < 100);
  const signalCount = Number(signals.fullTeam) + Number(signals.roadmapMature) + Number(signals.hasFunding);
  const delayHours: 0 | 24 | 48 | 72 = immediatelyEligible && !signals.hasFunding ? 0 : signalCount === 3 ? 72 : signalCount > 0 ? 48 : 24;
  const explanation = [
    delayHours === 0 ? "Eligible for immediate deletion" : `Scheduled ${delayHours} hours after the request`,
    signals.hasFunding ? "Funding interest requires a notice period" : "No funding interest recorded",
    signals.fullTeam ? "All active roles are filled" : "The active team is not full",
    signals.roadmapMature ? `${completed.length} roadmap milestones are complete` : "Fewer than two roadmap milestones are complete",
  ];
  return { immediate: delayHours === 0, delayHours, deadline: new Date(now.getTime() + delayHours * 3_600_000), signals, facts: { ageHours, nonOwnerMembers: members.length, followers: followers.length, completedMilestones: completed.length, fundingInterests: funding.length }, explanation };
}

export async function projectDeletionAudience(projectId: string) {
  const db = getDb();
  const [[project], members, funding] = await Promise.all([
    db.select({ ownerId: projects.ownerId }).from(projects).where(eq(projects.id, projectId)).limit(1),
    db.select({ userId: projectMembers.userId }).from(projectMembers).where(eq(projectMembers.projectId, projectId)),
    db.select({ userId: projectFundingInterests.userId }).from(projectFundingInterests).where(eq(projectFundingInterests.projectId, projectId)),
  ]);
  return [...new Set([project?.ownerId, ...members.map(row=>row.userId), ...funding.map(row=>row.userId)].filter((value): value is string => Boolean(value)))];
}

export async function notifyProjectDeletion(input: { projectId: string; projectTitle: string; actorId: string | null; actorName?: string | null; audience: string[]; event: "requested" | "cancelled" | "finalized"; deadline?: Date | null }) {
  const copy = input.event === "requested"
    ? { title: "Project is being disbanded", body: `${input.actorName ?? "A project owner"} requested that ${input.projectTitle} be disbanded. It is read-only and scheduled for deletion on ${input.deadline?.toLocaleString("en-GB", { timeZone: "Europe/London" })}.` }
    : input.event === "cancelled"
      ? { title: "Project deletion cancelled", body: `${input.projectTitle} will remain active.` }
      : { title: "Project disbanded", body: `${input.projectTitle} has been deleted and is no longer accessible.` };
  await createNotifications(input.audience.map(userId => ({ userId, actorId: input.actorId, type: "account" as const, title: copy.title, body: copy.body, entityType: "project", entityId: input.projectId, href: "/?view=notifications", required: true })));
}

export async function finalizeDueProjectDeletions(now = new Date()) {
  const db = getDb();
  const due = await db.select({ id: projects.id, title: projects.title, requestedBy: projects.deletionRequestedBy }).from(projects).where(and(eq(projects.status, "pending_deletion"), lte(projects.deletionScheduledAt, now)));
  const finalized: string[] = [];
  for (const project of due) {
    const audience = await projectDeletionAudience(project.id);
    const changed = await db.transaction(async tx => {
      const [result] = await tx.update(projects).set({ status: "deleted", deletedAt: now, updatedAt: now }).where(and(eq(projects.id, project.id), eq(projects.status, "pending_deletion"), lte(projects.deletionScheduledAt, now))).returning({ id: projects.id });
      return result;
    });
    if (!changed) continue;
    finalized.push(project.id);
    await notifyProjectDeletion({ projectId: project.id, projectTitle: project.title, actorId: project.requestedBy, audience, event: "finalized" });
    await audit(project.requestedBy, "project.deletion_finalized", "project", project.id, { scheduledFinalizer: true });
  }
  return finalized;
}
