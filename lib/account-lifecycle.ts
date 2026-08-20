import "server-only";

import { and, asc, eq, inArray, isNotNull, isNull, lte, ne, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accessibilitySettings,
  accounts,
  adminAssignments,
  adminMfa,
  authenticators,
  careerHistory,
  contentDrafts,
  educationHistory,
  integrationAccounts,
  meetingParticipants,
  meetings,
  memberEmbeddings,
  notificationPreferences,
  notifications,
  privacySettings,
  projectLeadershipElections,
  projectLeadershipVotes,
  projectMembers,
  projectRoles,
  projects,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import { scoreMatch } from "@/lib/matching";
import { createNotifications } from "@/lib/notifications";
import { sendMeetingCancellationEmail } from "@/lib/email";

export const LEADERSHIP_DECISION_MS = 24 * 60 * 60_000;
export const ACCOUNT_DEACTIVATION_MONTHS = 3;
export const ACCOUNT_DELETION_RECOVERY_MS = 30 * 24 * 60 * 60_000;

export function addCalendarMonths(date: Date, months: number) {
  const result = new Date(date);
  const intendedDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(intendedDay, lastDay));
  return result;
}

type ElectionCandidate = {
  id: string;
  name: string | null;
  profession: string | null;
  industry: string | null;
  primarySkill: string | null;
  secondarySkill: string | null;
  tertiarySkill: string | null;
  skills: string[];
  interests: string[];
  joinedAt: Date;
  membershipRole: string;
};

async function eligibleCandidates(projectId: string, electorate: "co_owners" | "members", database = getDb()) {
  const roleFilter = electorate === "co_owners" ? eq(projectMembers.membershipRole, "co_owner") : ne(projectMembers.membershipRole, "former_owner");
  return database.select({
    id: users.id,
    name: users.name,
    profession: users.profession,
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

export async function initiateAccountDeactivation(userId: string) {
  const db = getDb();
  const now = new Date();
  const recoveryDeadline = addCalendarMonths(now, ACCOUNT_DEACTIVATION_MONTHS);
  const [member] = await db.select({ id: users.id, status: users.status }).from(users).where(eq(users.id, userId)).limit(1);
  if (!member || member.status !== "active") throw new ApiError(409, "This account is not active.");

  const scheduledMeets = await db.select({ id: meetings.id, title: meetings.title, attendees: meetings.attendees }).from(meetings).where(and(
    eq(meetings.createdBy, userId),
    sql`${meetings.startsAt} > ${now}`,
    isNull(meetings.endedAt),
    isNull(meetings.cancelledAt),
  ));
  const meetIds = scheduledMeets.map(meet => meet.id);
  const meetInvitees = meetIds.length ? await db.select({ meetingId: meetingParticipants.meetingId, userId: meetingParticipants.userId }).from(meetingParticipants).where(inArray(meetingParticipants.meetingId, meetIds)) : [];

  await db.transaction(async tx => {
    await tx.update(users).set({
      status: "deactivated",
      availability: "closed",
      deactivatedAt: now,
      deletionRequestedAt: null,
      recoveryDeadline,
      sessionVersion: sql`${users.sessionVersion} + 1`,
      forcePasswordChange: false,
      updatedAt: now,
    }).where(and(eq(users.id, userId), eq(users.status, "active")));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(integrationAccounts).where(eq(integrationAccounts.userId, userId));
    await tx.update(adminAssignments).set({ status: "suspended", updatedAt: now }).where(eq(adminAssignments.userId, userId));
    if (meetIds.length) await tx.update(meetings).set({ cancelledAt: now, cancellationReason: "Host account is no longer active", joinUrl: null, updatedAt: now }).where(inArray(meetings.id, meetIds));
  });

  await createNotifications(meetInvitees.map(invitee => {
    const meeting = scheduledMeets.find(item => item.id === invitee.meetingId)!;
    return { userId: invitee.userId, actorId: null, type: "meet" as const, required: true, title: `${meeting.title} was cancelled`, body: "The host account is no longer active, so this scheduled meet will not take place.", entityType: "meeting", entityId: meeting.id, href: "/?view=meet" };
  }));
  await Promise.allSettled(scheduledMeets.flatMap(meeting => (meeting.attendees ?? []).map(attendee => sendMeetingCancellationEmail({ email: attendee.email, name: attendee.name, title: meeting.title }))));
  return { recoveryDeadline, cancelledMeets: scheduledMeets.length };
}

export async function initiateAccountDeletion(userId: string) {
  const db = getDb();
  const now = new Date();
  const leadershipDeadline = new Date(now.getTime() + LEADERSHIP_DECISION_MS);
  const recoveryDeadline = new Date(now.getTime() + ACCOUNT_DELETION_RECOVERY_MS);
  const [member] = await db.select({ id: users.id, status: users.status, deletionRequestedAt: users.deletionRequestedAt }).from(users).where(eq(users.id, userId)).limit(1);
  if (!member || !["active", "deactivated"].includes(member.status) || member.deletionRequestedAt) throw new ApiError(409, "This account cannot be scheduled for deletion.");

  const ownedProjects = await db.select({ id: projects.id, title: projects.title }).from(projects).where(and(
    eq(projects.ownerId, userId),
    notInArray(projects.status, ["pending_deletion", "deleted"]),
  ));
  const transitions = await Promise.all(ownedProjects.map(async project => {
    const coOwners = await eligibleCandidates(project.id, "co_owners");
    if (coOwners.length === 1) return { project, kind: "transfer" as const, candidates: coOwners };
    const electorate = coOwners.length > 1 ? "co_owners" as const : "members" as const;
    const candidates = coOwners.length > 1 ? coOwners : (await eligibleCandidates(project.id, "members")).filter(candidate => candidate.id !== userId);
    return { project, kind: "election" as const, electorate, candidates };
  }));

  const scheduledMeets = await db.select({ id: meetings.id, title: meetings.title, attendees: meetings.attendees }).from(meetings).where(and(
    eq(meetings.createdBy, userId),
    sql`${meetings.startsAt} > ${now}`,
    isNull(meetings.endedAt),
    isNull(meetings.cancelledAt),
  ));
  const meetIds = scheduledMeets.map(meet => meet.id);
  const meetInvitees = meetIds.length ? await db.select({ meetingId: meetingParticipants.meetingId, userId: meetingParticipants.userId }).from(meetingParticipants).where(inArray(meetingParticipants.meetingId, meetIds)) : [];

  const electionNotices: Array<{ userId: string; projectId: string; projectTitle: string }> = [];
  const transferNotices: Array<{ userId: string; projectId: string; projectTitle: string }> = [];
  await db.transaction(async tx => {
    await tx.update(users).set({
      status: "deactivated",
      availability: "closed",
      deactivatedAt: member.status === "active" ? now : undefined,
      deletionRequestedAt: now,
      recoveryDeadline,
      sessionVersion: sql`${users.sessionVersion} + 1`,
      forcePasswordChange: false,
      updatedAt: now,
    }).where(and(eq(users.id, userId), inArray(users.status, ["active", "deactivated"]), isNull(users.deletionRequestedAt)));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(integrationAccounts).where(eq(integrationAccounts.userId, userId));
    await tx.update(adminAssignments).set({ status: "suspended", updatedAt: now }).where(eq(adminAssignments.userId, userId));

    if (meetIds.length) await tx.update(meetings).set({ cancelledAt: now, cancellationReason: "Host account is no longer active", joinUrl: null, updatedAt: now }).where(inArray(meetings.id, meetIds));

    for (const transition of transitions) {
      await tx.update(projectMembers).set({ membershipRole: "former_owner" }).where(and(eq(projectMembers.projectId, transition.project.id), eq(projectMembers.userId, userId)));
      if (transition.kind === "transfer") {
        const nextOwner = transition.candidates[0];
        await tx.update(projects).set({ ownerId: nextOwner.id, updatedAt: now }).where(and(eq(projects.id, transition.project.id), eq(projects.ownerId, userId)));
        await tx.update(projectMembers).set({ membershipRole: "owner" }).where(and(eq(projectMembers.projectId, transition.project.id), eq(projectMembers.userId, nextOwner.id)));
        await tx.insert(projectLeadershipElections).values({ projectId: transition.project.id, formerOwnerId: userId, electorate: "co_owners", status: "completed", deadline: now, selectedUserId: nextOwner.id, selectionMethod: "single_co_owner", completedAt: now });
        transferNotices.push({ userId: nextOwner.id, projectId: transition.project.id, projectTitle: transition.project.title });
      } else {
        const [election] = await tx.insert(projectLeadershipElections).values({ projectId: transition.project.id, formerOwnerId: userId, electorate: transition.electorate, deadline: leadershipDeadline }).returning({ id: projectLeadershipElections.id });
        for (const candidate of transition.candidates) electionNotices.push({ userId: candidate.id, projectId: election.id, projectTitle: transition.project.title });
      }
    }
  });

  await createNotifications([
    ...meetInvitees.map(invitee => {
      const meeting = scheduledMeets.find(item => item.id === invitee.meetingId)!;
      return { userId: invitee.userId, actorId: null, type: "meet" as const, required: true, title: `${meeting.title} was cancelled`, body: "The host account is no longer active, so this scheduled meet will not take place.", entityType: "meeting", entityId: meeting.id, href: "/?view=meet" };
    }),
    ...transferNotices.map(notice => ({ userId: notice.userId, actorId: null, type: "project" as const, required: true, title: `You are now the owner of ${notice.projectTitle}`, body: "The previous owner account is no longer active. Ownership transferred to you as the sole co-owner.", entityType: "project", entityId: notice.projectId, href: `/?project=${notice.projectId}` })),
    ...electionNotices.map(notice => ({ userId: notice.userId, actorId: null, type: "project" as const, required: true, title: `Choose the next lead for ${notice.projectTitle}`, body: "The owner account is no longer active. Vote within 24 hours or n2 will select the strongest project match.", entityType: "leadership_election", entityId: notice.projectId, href: "/?view=settings" })),
  ]);
  await Promise.allSettled(scheduledMeets.flatMap(meeting => (meeting.attendees ?? []).map(attendee => sendMeetingCancellationEmail({ email: attendee.email, name: attendee.name, title: meeting.title }))));
  return { recoveryDeadline, leadershipDeadline, transferred: transferNotices.length, elections: transitions.filter(item => item.kind === "election").length, cancelledMeets: scheduledMeets.length };
}

function candidateFit(project: { title: string; summary: string; description: string | null; industry: string }, roles: Array<{ requiredSkills: string[]; usefulSkills: string[] }>, candidate: ElectionCandidate) {
  const projectSkills = [...new Set(roles.flatMap(role => [...role.requiredSkills, ...role.usefulSkills]))];
  const projectTags = [...new Set(`${project.title} ${project.summary} ${project.description ?? ""} ${project.industry}`.toLowerCase().split(/[^a-z0-9+#]+/).filter(word => word.length > 3))];
  const result = scoreMatch({
    memberSkills: [candidate.primarySkill, candidate.secondarySkill, candidate.tertiarySkill, ...candidate.skills].filter((value): value is string => Boolean(value)),
    memberInterests: candidate.interests,
    memberIndustry: candidate.industry,
    projectSkills,
    projectIndustry: project.industry,
    projectTags,
  });
  return result.score + (candidate.membershipRole === "co_owner" ? 10 : 0);
}

export async function finaliseLeadershipElection(electionId: string) {
  const db = getDb();
  const now = new Date();
  const [election] = await db.select().from(projectLeadershipElections).where(and(eq(projectLeadershipElections.id, electionId), eq(projectLeadershipElections.status, "open"), lte(projectLeadershipElections.deadline, now))).limit(1);
  if (!election) return null;
  const [project] = await db.select({ id: projects.id, title: projects.title, summary: projects.summary, description: projects.description, industry: projects.industry }).from(projects).where(eq(projects.id, election.projectId)).limit(1);
  if (!project) return null;
  const candidates = await eligibleCandidates(project.id, election.electorate);
  const votes = await db.select({ candidateId: projectLeadershipVotes.candidateId, total: sql<number>`count(*)::int` }).from(projectLeadershipVotes).where(eq(projectLeadershipVotes.electionId, election.id)).groupBy(projectLeadershipVotes.candidateId);
  const validIds = new Set(candidates.map(candidate => candidate.id));
  const validVotes = votes.filter(vote => validIds.has(vote.candidateId));
  const highestVote = Math.max(0, ...validVotes.map(vote => Number(vote.total)));
  const voteLeaders = validVotes.filter(vote => Number(vote.total) === highestVote && highestVote > 0);
  let winner = voteLeaders.length === 1 ? candidates.find(candidate => candidate.id === voteLeaders[0].candidateId) : undefined;
  let method: "vote" | "fit" | "no_candidate" = winner ? "vote" : "fit";
  if (!winner && candidates.length) {
    const roles = await db.select({ requiredSkills: projectRoles.requiredSkills, usefulSkills: projectRoles.usefulSkills }).from(projectRoles).where(eq(projectRoles.projectId, project.id));
    winner = [...candidates].sort((left, right) => candidateFit(project, roles, right) - candidateFit(project, roles, left) || left.joinedAt.getTime() - right.joinedAt.getTime() || left.id.localeCompare(right.id))[0];
  }
  if (!winner) method = "no_candidate";

  await db.transaction(async tx => {
    if (winner) {
      await tx.update(projects).set({ ownerId: winner.id, updatedAt: now }).where(eq(projects.id, project.id));
      await tx.update(projectMembers).set({ membershipRole: "owner" }).where(and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, winner.id)));
    } else {
      await tx.update(projects).set({ status: "archived", visibility: "private", updatedAt: now }).where(eq(projects.id, project.id));
    }
    await tx.update(projectLeadershipElections).set({ status: "completed", selectedUserId: winner?.id ?? null, selectionMethod: method, completedAt: now }).where(and(eq(projectLeadershipElections.id, election.id), eq(projectLeadershipElections.status, "open")));
  });
  if (winner) await createNotifications([{ userId: winner.id, actorId: null, type: "project", required: true, title: `You are now the owner of ${project.title}`, body: method === "vote" ? "The project team selected you as its next lead." : "The 24-hour decision window ended, and n2 selected you as the strongest project match.", entityType: "project", entityId: project.id, href: `/?project=${project.id}` }]);
  return { electionId, projectId: project.id, selectedUserId: winner?.id ?? null, method };
}

export async function processDueAccountTransitions() {
  const db = getDb();
  const now = new Date();
  const dueElections = await db.select({ id: projectLeadershipElections.id }).from(projectLeadershipElections).where(and(eq(projectLeadershipElections.status, "open"), lte(projectLeadershipElections.deadline, now)));
  const elections = [];
  for (const { id } of dueElections) {
    const result = await finaliseLeadershipElection(id);
    if (result) elections.push(result);
  }
  const expiredDeactivations = await db.select({ id: users.id }).from(users).where(and(
    eq(users.status, "deactivated"),
    isNull(users.deletionRequestedAt),
    lte(users.recoveryDeadline, now),
  ));
  const scheduledAccounts = [];
  for (const account of expiredDeactivations) {
    const result = await initiateAccountDeletion(account.id);
    scheduledAccounts.push({ id: account.id, recoveryDeadline: result.recoveryDeadline });
  }
  const dueAccounts = await db.select({ id: users.id, email: users.email }).from(users).where(and(
    eq(users.status, "deactivated"),
    isNotNull(users.deletionRequestedAt),
    lte(users.recoveryDeadline, now),
  ));
  for (const account of dueAccounts) await finaliseAccountDeletion(account.id, account.email);
  return { elections, scheduledAccounts, deletedAccounts: dueAccounts.map(account => account.id) };
}

export async function finaliseAccountDeletion(userId: string, previousEmail: string, expectedStatus = "deactivated") {
  const db = getDb();
  const now = new Date();
  const deletedIdentity = userId.replaceAll("-", "");
  await db.transaction(async tx => {
    await tx.delete(accounts).where(eq(accounts.userId, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(authenticators).where(eq(authenticators.userId, userId));
    await tx.delete(integrationAccounts).where(eq(integrationAccounts.userId, userId));
    await tx.delete(contentDrafts).where(eq(contentDrafts.ownerId, userId));
    await tx.delete(careerHistory).where(eq(careerHistory.userId, userId));
    await tx.delete(educationHistory).where(eq(educationHistory.userId, userId));
    await tx.delete(notifications).where(eq(notifications.userId, userId));
    await tx.delete(notificationPreferences).where(eq(notificationPreferences.userId, userId));
    await tx.delete(privacySettings).where(eq(privacySettings.userId, userId));
    await tx.delete(accessibilitySettings).where(eq(accessibilitySettings.userId, userId));
    await tx.delete(memberEmbeddings).where(eq(memberEmbeddings.userId, userId));
    await tx.delete(adminMfa).where(eq(adminMfa.userId, userId));
    await tx.delete(adminAssignments).where(eq(adminAssignments.userId, userId));
    await tx.delete(verificationTokens).where(inArray(verificationTokens.identifier, [`verify:${previousEmail}`, `reset:${previousEmail}`, `onboarding:${previousEmail}`]));
    const statusGuard = expectedStatus === "deactivated"
      ? and(eq(users.id, userId), eq(users.status, "deactivated"), isNotNull(users.deletionRequestedAt))
      : and(eq(users.id, userId), eq(users.status, expectedStatus));
    await tx.update(users).set({ title: null, firstName: null, lastName: null, age: null, dateOfBirth: null, ageBand: "adult", name: "Deleted member", username: `deleted_${deletedIdentity}`, email: `deleted+${deletedIdentity}@nice2.invalid`, emailVerified: null, image: null, coverImage: null, passwordHash: null, profession: null, headline: null, bio: null, industry: null, primarySkill: null, secondarySkill: null, tertiarySkill: null, skills: [], interests: [], location: null, city: null, country: null, timezone: "Europe/London", workMode: "remote", availability: "closed", role: "deleted", status: "deleted", suspendedUntil: null, deletionRequestedAt: null, recoveryDeadline: null, mfaEnrolledAt: null, onboardingCompletedAt: null, updatedAt: now }).where(statusGuard);
  });
}
