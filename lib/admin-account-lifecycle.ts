import "server-only";

import { and, asc, eq, gt, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accountDeletionHolds,
  meetingParticipants,
  meetings,
  projectMembers,
  projectRoles,
  projects,
  sessions,
  users,
} from "@/db/schema";
import { finaliseAccountDeletion } from "@/lib/account-lifecycle";
import { ApiError } from "@/lib/api";
import { sendMeetingCancellationEmail } from "@/lib/email";
import { scoreMatch } from "@/lib/matching";
import { createNotifications } from "@/lib/notifications";

export const ADMIN_DELETION_RETENTION_MS = 7 * 24 * 60 * 60_000;
export const suspensionDurations = {
  "24h": 24 * 60 * 60_000,
  "3d": 3 * 24 * 60 * 60_000,
  "5d": 5 * 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
  "30d": 30 * 24 * 60 * 60_000,
} as const;
export type SuspensionDuration = keyof typeof suspensionDurations;

type Candidate = {
  id: string;
  industry: string | null;
  primarySkill: string | null;
  secondarySkill: string | null;
  tertiarySkill: string | null;
  skills: string[];
  interests: string[];
  joinedAt: Date;
  membershipRole: string;
};

export function suspensionDeadline(duration: SuspensionDuration, now = new Date()) {
  return new Date(now.getTime() + suspensionDurations[duration]);
}

export async function reconcileExpiredSuspension(userId: string, now = new Date()) {
  const [member] = await getDb().select({ status: users.status, suspendedUntil: users.suspendedUntil }).from(users).where(eq(users.id, userId)).limit(1);
  if (member?.status !== "suspended" || !member.suspendedUntil || member.suspendedUntil > now) return false;
  const [changed] = await getDb().update(users).set({ status: "active", suspendedUntil: null, updatedAt: now }).where(and(
    eq(users.id, userId),
    eq(users.status, "suspended"),
    lte(users.suspendedUntil, now),
  )).returning({ id: users.id });
  return Boolean(changed);
}

export async function sweepExpiredSuspensions(now = new Date()) {
  return getDb().update(users).set({ status: "active", suspendedUntil: null, updatedAt: now }).where(and(
    eq(users.status, "suspended"),
    lte(users.suspendedUntil, now),
  )).returning({ id: users.id });
}

export async function scheduleAdminAccountDeletion(input: { userId: string; requestedBy: string; policyCode: string; reason: string }, now = new Date()) {
  const db = getDb();
  const [member] = await db.select({ id: users.id, status: users.status }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (!member) throw new ApiError(404, "Member not found");
  if (!inArrayValue(member.status, ["active", "suspended", "banned"])) throw new ApiError(409, "This account cannot enter the admin deletion hold.");
  const scheduledAt = new Date(now.getTime() + ADMIN_DELETION_RETENTION_MS);
  const [hold] = await db.transaction(async tx => {
    const [existing] = await tx.select({ id: accountDeletionHolds.id }).from(accountDeletionHolds).where(and(
      eq(accountDeletionHolds.userId, input.userId),
      inArray(accountDeletionHolds.status, ["pending", "finalizing"]),
    )).limit(1);
    if (existing) throw new ApiError(409, "This account is already scheduled for permanent deletion.");
    const [created] = await tx.insert(accountDeletionHolds).values({
      userId: input.userId,
      requestedBy: input.requestedBy,
      previousStatus: member.status,
      policyCode: input.policyCode,
      reason: input.reason,
      scheduledAt,
    }).returning();
    const [changed] = await tx.update(users).set({
      status: "pending_admin_deletion",
      sessionVersion: sql`${users.sessionVersion} + 1`,
      forcePasswordChange: false,
      updatedAt: now,
    }).where(and(eq(users.id, input.userId), eq(users.status, member.status))).returning({ id: users.id });
    if (!changed) throw new ApiError(409, "The account state changed. Refresh and try again.");
    await tx.delete(sessions).where(eq(sessions.userId, input.userId));
    return [created];
  });
  return hold;
}

export async function restoreAdminAccountDeletion(input: { userId: string; restoredBy: string }, now = new Date()) {
  const db = getDb();
  const [hold] = await db.select().from(accountDeletionHolds).where(and(
    eq(accountDeletionHolds.userId, input.userId),
    eq(accountDeletionHolds.status, "pending"),
  )).limit(1);
  if (!hold) throw new ApiError(404, "No restorable deletion hold was found.");
  if (hold.scheduledAt <= now) throw new ApiError(409, "The seven-day restoration window has ended.");
  const [member] = await db.select({ status: users.status, suspendedUntil: users.suspendedUntil }).from(users).where(eq(users.id, input.userId)).limit(1);
  if (member?.status !== "pending_admin_deletion") throw new ApiError(409, "The account is no longer held for deletion.");
  const restoredStatus = hold.previousStatus === "suspended" && member.suspendedUntil && member.suspendedUntil <= now
    ? "active"
    : hold.previousStatus;
  await db.transaction(async tx => {
    const [restored] = await tx.update(accountDeletionHolds).set({ status: "restored", restoredBy: input.restoredBy, restoredAt: now }).where(and(
      eq(accountDeletionHolds.id, hold.id),
      eq(accountDeletionHolds.status, "pending"),
      gt(accountDeletionHolds.scheduledAt, now),
    )).returning({ id: accountDeletionHolds.id });
    if (!restored) throw new ApiError(409, "The restoration window has ended.");
    await tx.update(users).set({
      status: restoredStatus,
      suspendedUntil: restoredStatus === "suspended" ? member.suspendedUntil : null,
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: now,
    }).where(and(eq(users.id, input.userId), eq(users.status, "pending_admin_deletion")));
  });
  return { restoredStatus };
}

function inArrayValue<T extends string>(value: string, values: readonly T[]): value is T {
  return values.includes(value as T);
}

async function eligibleCandidates(projectId: string, coOwnersOnly: boolean) {
  const roleFilter = coOwnersOnly ? eq(projectMembers.membershipRole, "co_owner") : ne(projectMembers.membershipRole, "former_owner");
  return getDb().select({
    id: users.id,
    industry: users.industry,
    primarySkill: users.primarySkill,
    secondarySkill: users.secondarySkill,
    tertiarySkill: users.tertiarySkill,
    skills: users.skills,
    interests: users.interests,
    joinedAt: projectMembers.joinedAt,
    membershipRole: projectMembers.membershipRole,
  }).from(projectMembers).innerJoin(users, eq(users.id, projectMembers.userId)).where(and(
    eq(projectMembers.projectId, projectId),
    eq(users.status, "active"),
    roleFilter,
  )).orderBy(asc(projectMembers.joinedAt));
}

function candidateFit(project: { title: string; summary: string; description: string | null; industry: string }, roles: Array<{ requiredSkills: string[]; usefulSkills: string[] }>, candidate: Candidate) {
  const projectSkills = [...new Set(roles.flatMap(role => [...role.requiredSkills, ...role.usefulSkills]))];
  const projectTags = [...new Set(`${project.title} ${project.summary} ${project.description ?? ""} ${project.industry}`.toLowerCase().split(/[^a-z0-9+#]+/).filter(word => word.length > 3))];
  return scoreMatch({
    memberSkills: [candidate.primarySkill, candidate.secondarySkill, candidate.tertiarySkill, ...candidate.skills].filter((value): value is string => Boolean(value)),
    memberInterests: candidate.interests,
    memberIndustry: candidate.industry,
    projectSkills,
    projectIndustry: project.industry,
    projectTags,
  }).score;
}

async function selectSuccessor(project: { id: string; title: string; summary: string; description: string | null; industry: string }) {
  const coOwners = await eligibleCandidates(project.id, true);
  if (coOwners.length === 1) return { winner: coOwners[0], method: "single_co_owner" as const };
  const candidates = coOwners.length ? coOwners : await eligibleCandidates(project.id, false);
  if (!candidates.length) return { winner: null, method: "no_candidate" as const };
  const roles = await getDb().select({ requiredSkills: projectRoles.requiredSkills, usefulSkills: projectRoles.usefulSkills }).from(projectRoles).where(eq(projectRoles.projectId, project.id));
  const winner = [...candidates].sort((left, right) => candidateFit(project, roles, right) - candidateFit(project, roles, left) || left.joinedAt.getTime() - right.joinedAt.getTime() || left.id.localeCompare(right.id))[0];
  return { winner, method: "fit" as const };
}

async function finaliseAdminDeletionHold(holdId: string, now = new Date()) {
  const db = getDb();
  const [hold] = await db.update(accountDeletionHolds).set({ status: "finalizing" }).where(and(
    eq(accountDeletionHolds.id, holdId),
    eq(accountDeletionHolds.status, "pending"),
    lte(accountDeletionHolds.scheduledAt, now),
  )).returning();
  if (!hold) return null;
  try {
    const [member] = await db.select({ id: users.id, email: users.email, status: users.status }).from(users).where(eq(users.id, hold.userId)).limit(1);
    if (!member || member.status !== "pending_admin_deletion") {
      await db.update(accountDeletionHolds).set({ status: "restored", restoredAt: now }).where(eq(accountDeletionHolds.id, hold.id));
      return null;
    }
    const ownedProjects = await db.select({ id: projects.id, title: projects.title, summary: projects.summary, description: projects.description, industry: projects.industry, status: projects.status }).from(projects).where(and(
      eq(projects.ownerId, member.id),
      ne(projects.status, "deleted"),
    ));
    const transitions = await Promise.all(ownedProjects.map(async project => ({ project, ...(await selectSuccessor(project)) })));
    const scheduledMeets = await db.select({ id: meetings.id, title: meetings.title, attendees: meetings.attendees }).from(meetings).where(and(
      eq(meetings.createdBy, member.id),
      sql`${meetings.startsAt} > ${now}`,
      isNull(meetings.endedAt),
      isNull(meetings.cancelledAt),
    ));
    const meetIds = scheduledMeets.map(meeting => meeting.id);
    const invitees = meetIds.length ? await db.select({ meetingId: meetingParticipants.meetingId, userId: meetingParticipants.userId }).from(meetingParticipants).where(inArray(meetingParticipants.meetingId, meetIds)) : [];
    await db.transaction(async tx => {
      for (const transition of transitions) {
        await tx.update(projectMembers).set({ membershipRole: "former_owner" }).where(and(eq(projectMembers.projectId, transition.project.id), eq(projectMembers.userId, member.id)));
        if (transition.winner) {
          await tx.update(projects).set({ ownerId: transition.winner.id, updatedAt: now }).where(and(eq(projects.id, transition.project.id), eq(projects.ownerId, member.id)));
          await tx.update(projectMembers).set({ membershipRole: "owner" }).where(and(eq(projectMembers.projectId, transition.project.id), eq(projectMembers.userId, transition.winner.id)));
        } else if (transition.project.status !== "pending_deletion") {
          await tx.update(projects).set({ status: "archived", visibility: "private", updatedAt: now }).where(and(eq(projects.id, transition.project.id), eq(projects.ownerId, member.id)));
        }
      }
      if (meetIds.length) await tx.update(meetings).set({ cancelledAt: now, cancellationReason: "Host account was permanently deleted", joinUrl: null, updatedAt: now }).where(inArray(meetings.id, meetIds));
    });
    await finaliseAccountDeletion(member.id, member.email, "pending_admin_deletion");
    await db.update(accountDeletionHolds).set({ status: "finalized", finalizedAt: now }).where(and(eq(accountDeletionHolds.id, hold.id), eq(accountDeletionHolds.status, "finalizing")));
    await createNotifications([
      ...transitions.filter(transition => transition.winner).map(transition => ({ userId: transition.winner!.id, actorId: null, type: "project" as const, required: true, title: `You are now the owner of ${transition.project.title}`, body: transition.method === "single_co_owner" ? "Ownership transferred to you as the sole active co-owner." : "n2 selected you as the strongest eligible project match.", entityType: "project", entityId: transition.project.id, href: `/?project=${transition.project.id}` })),
      ...invitees.map(invitee => { const meeting = scheduledMeets.find(item => item.id === invitee.meetingId)!; return { userId: invitee.userId, actorId: null, type: "meet" as const, required: true, title: `${meeting.title} was cancelled`, body: "The host account was permanently deleted, so this scheduled meet will not take place.", entityType: "meeting", entityId: meeting.id, href: "/?view=meet" }; }),
    ]);
    await Promise.allSettled(scheduledMeets.flatMap(meeting => (meeting.attendees ?? []).map(attendee => sendMeetingCancellationEmail({ email: attendee.email, name: attendee.name, title: meeting.title }))));
    return { userId: member.id, projects: transitions.length, cancelledMeets: scheduledMeets.length };
  } catch (error) {
    await db.update(accountDeletionHolds).set({ status: "pending" }).where(and(eq(accountDeletionHolds.id, hold.id), eq(accountDeletionHolds.status, "finalizing")));
    throw error;
  }
}

export async function finalizeDueAdminAccountDeletions(now = new Date()) {
  const due = await getDb().select({ id: accountDeletionHolds.id }).from(accountDeletionHolds).where(and(
    eq(accountDeletionHolds.status, "pending"),
    lte(accountDeletionHolds.scheduledAt, now),
  )).orderBy(asc(accountDeletionHolds.scheduledAt));
  const finalized = [];
  for (const hold of due) {
    const result = await finaliseAdminDeletionHold(hold.id, now);
    if (result) finalized.push(result);
  }
  return finalized;
}
