import "server-only";
import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { blocks, follows, meetingParticipants, meetings, projectMembers, sanctions, users } from "@/db/schema";
import { ApiError } from "@/lib/api";

export const MEETING_CAPACITY = {
  video: 8,
  audio: 16,
  in_person: 100,
} as const;

export type MeetingMode = keyof typeof MEETING_CAPACITY;
export type MeetingParticipantRole = "cohost" | "speaker" | "listener";
export const MAX_MEETING_COHOSTS = 2;

export function isMeetingMode(value: string): value is MeetingMode {
  return value === "video" || value === "audio" || value === "in_person";
}

export async function requireMeetingAccess(meetingId: string, userId: string) {
  const db = getDb();
  const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1);
  if (!meeting) throw new ApiError(404, "Meet not found");
  if (meeting.createdBy === userId || meeting.visibility === "public") return meeting;

  const [invite] = await db.select({ userId: meetingParticipants.userId })
    .from(meetingParticipants)
    .where(and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, userId)))
    .limit(1);
  if (invite) return meeting;

  if (meeting.visibility === "project" && meeting.projectId) {
    const [membership] = await db.select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, meeting.projectId), eq(projectMembers.userId, userId)))
      .limit(1);
    if (membership) return meeting;
  }

  throw new ApiError(403, "This meet is private");
}

export async function getMeetingAuthority(meetingId: string, userId: string) {
  const [row] = await getDb().select({ meeting: meetings, participantRole: meetingParticipants.role })
    .from(meetings)
    .leftJoin(meetingParticipants, and(eq(meetingParticipants.meetingId, meetings.id), eq(meetingParticipants.userId, userId)))
    .where(eq(meetings.id, meetingId))
    .limit(1);
  if (!row) throw new ApiError(404, "Meet not found");
  const isPrimaryHost = row.meeting.createdBy === userId;
  const isCohost = row.participantRole === "cohost";
  return {
    meeting: row.meeting,
    role: isPrimaryHost ? "host" : row.participantRole,
    isPrimaryHost,
    isCohost,
    canManage: isPrimaryHost || isCohost,
    canDelete: isPrimaryHost,
  };
}

export async function requireMeetingManager(meetingId: string, userId: string) {
  const authority = await getMeetingAuthority(meetingId, userId);
  if (!authority.canManage) throw new ApiError(403, "Only the host or a co-host can manage this meet");
  return authority;
}

export function meetingCohostIds(attendeeIds: string[], attendeeRoles: Record<string, MeetingParticipantRole>) {
  const attendeeSet = new Set(attendeeIds);
  const unknownRoleIds = Object.keys(attendeeRoles).filter(id => !attendeeSet.has(id));
  if (unknownRoleIds.length) throw new ApiError(400, "Attendee roles must belong to selected attendees");
  const cohostIds = attendeeIds.filter(id => attendeeRoles[id] === "cohost");
  if (cohostIds.length > MAX_MEETING_COHOSTS) throw new ApiError(400, "Choose no more than two co-hosts");
  return cohostIds;
}

export async function validateMeetingCohostCandidates(primaryHostId: string, candidateIds: string[]) {
  const ids = [...new Set(candidateIds)];
  if (!ids.length) return;
  if (ids.includes(primaryHostId)) throw new ApiError(400, "The primary host cannot also be selected as a co-host");
  const db = getDb();
  const [host] = await db.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, primaryHostId)).limit(1);
  const [candidates, relationships, blocked, restricted] = await Promise.all([
    db.select({ id: users.id, name: users.name, username: users.username, status: users.status, ageBand: users.ageBand, emailVerified: users.emailVerified, onboardingCompletedAt: users.onboardingCompletedAt }).from(users).where(inArray(users.id, ids)),
    db.select({ followerId: follows.followerId, followingId: follows.followingId }).from(follows).where(or(
      and(eq(follows.followerId, primaryHostId), inArray(follows.followingId, ids)),
      and(eq(follows.followingId, primaryHostId), inArray(follows.followerId, ids)),
    )),
    db.select({ blockerId: blocks.blockerId, blockedId: blocks.blockedId }).from(blocks).where(or(
      and(eq(blocks.blockerId, primaryHostId), inArray(blocks.blockedId, ids)),
      and(eq(blocks.blockedId, primaryHostId), inArray(blocks.blockerId, ids)),
    )),
    db.select({ userId: sanctions.userId }).from(sanctions).where(and(inArray(sanctions.userId, ids), eq(sanctions.status, "active"), or(isNull(sanctions.expiresAt), gt(sanctions.expiresAt, new Date())))),
  ]);
  const candidatesById = new Map(candidates.map(candidate => [candidate.id, candidate]));
  const outbound = new Set(relationships.filter(row => row.followerId === primaryHostId).map(row => row.followingId));
  const inbound = new Set(relationships.filter(row => row.followingId === primaryHostId).map(row => row.followerId));
  const blockedIds = new Set(blocked.map(row => row.blockerId === primaryHostId ? row.blockedId : row.blockerId));
  const restrictedIds = new Set(restricted.map(row => row.userId));
  for (const id of ids) {
    const candidate = candidatesById.get(id);
    const label = candidate?.name || (candidate?.username ? `@${candidate.username}` : "This person");
    if (!candidate) throw new ApiError(400, `The selected co-host (${id}) no longer exists`);
    if (candidate.status !== "active" || !candidate.emailVerified || !candidate.onboardingCompletedAt) throw new ApiError(409, `${label} is not currently eligible to become a co-host`);
    if (!outbound.has(id) || !inbound.has(id)) throw new ApiError(409, `${label} must be a mutual connection before they can become a co-host`);
    if (blockedIds.has(id)) throw new ApiError(409, `${label} cannot be appointed because this connection is restricted`);
    if (restrictedIds.has(id)) throw new ApiError(409, `${label} is not currently eligible to become a co-host`);
    const mixedAge = host?.ageBand !== candidate.ageBand && [host?.ageBand, candidate.ageBand].includes("teen_16_17");
    if (mixedAge) throw new ApiError(403, `${label} cannot be appointed under the current member safety rules`);
  }
}
