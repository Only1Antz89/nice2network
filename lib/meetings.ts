import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { meetingParticipants, meetings, projectMembers } from "@/db/schema";
import { ApiError } from "@/lib/api";

export const MEETING_CAPACITY = {
  video: 8,
  audio: 16,
  in_person: 100,
} as const;

export type MeetingMode = keyof typeof MEETING_CAPACITY;

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
