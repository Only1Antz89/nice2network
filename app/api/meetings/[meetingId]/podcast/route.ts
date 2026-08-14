import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { meetingParticipants, meetingSignals, meetings, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { requireMeetingAccess } from "@/lib/meetings";

const actionSchema = z.object({
  action: z.enum(["request_speak", "cancel_request", "approve", "dismiss", "mute"]),
  userId: z.uuid().optional(),
});

const profile = {
  id: users.id,
  name: users.name,
  image: users.image,
  profession: users.profession,
  professionalHeadline: users.headline,
  city: users.city,
} as const;

async function getRole(meetingId: string, userId: string, creatorId: string) {
  if (userId === creatorId) return "host";
  const [row] = await getDb().select({ role: meetingParticipants.role })
    .from(meetingParticipants)
    .where(and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, userId)))
    .limit(1);
  return row?.role ?? "listener";
}

export async function GET(_: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const member = await requireMember();
    const { meetingId } = await params;
    const meeting = await requireMeetingAccess(meetingId, member.id);
    if (meeting.mode !== "audio") throw new ApiError(400, "This is not a podcast room");
    const db = getDb();
    const participants = await db.select({
      ...profile,
      role: meetingParticipants.role,
      speakerStatus: meetingParticipants.speakerStatus,
      status: meetingParticipants.status,
    }).from(meetingParticipants)
      .innerJoin(users, eq(users.id, meetingParticipants.userId))
      .where(eq(meetingParticipants.meetingId, meetingId));
    const [host] = await db.select(profile).from(users).where(eq(users.id, meeting.createdBy)).limit(1);
    const hostRow = host ? { ...host, role: "host", speakerStatus: "approved", status: "joined" } : null;
    const all = [hostRow, ...participants.filter(person => person.id !== meeting.createdBy)].filter(Boolean);
    return NextResponse.json({
      currentRole: await getRole(meetingId, member.id, meeting.createdBy),
      canModerate: ["host", "cohost"].includes(await getRole(meetingId, member.id, meeting.createdBy)),
      people: all,
    });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const member = await requireMember();
    const { meetingId } = await params;
    const input = actionSchema.parse(await request.json());
    const meeting = await requireMeetingAccess(meetingId, member.id);
    if (meeting.mode !== "audio") throw new ApiError(400, "This is not a podcast room");
    const db = getDb();
    const actorRole = await getRole(meetingId, member.id, meeting.createdBy);
    const targetId = input.userId ?? member.id;
    const moderating = ["approve", "dismiss", "mute"].includes(input.action);
    if (moderating && !["host", "cohost"].includes(actorRole)) throw new ApiError(403, "Only hosts can manage the podcast stage");
    if (!moderating && targetId !== member.id) throw new ApiError(403, "You can only manage your own request");

    if (input.action === "request_speak" || input.action === "cancel_request") {
      await db.insert(meetingParticipants).values({
        meetingId, userId: member.id, role: "listener",
        speakerStatus: input.action === "request_speak" ? "requested" : "none",
      }).onConflictDoUpdate({
        target: [meetingParticipants.meetingId, meetingParticipants.userId],
        set: { speakerStatus: input.action === "request_speak" ? "requested" : "none" },
      });
    } else if (input.action === "approve") {
      await db.update(meetingParticipants).set({ role: "audience_speaker", speakerStatus: "approved", promotedAt: new Date() })
        .where(and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, targetId)));
    } else if (input.action === "dismiss") {
      await db.update(meetingParticipants).set({ role: "listener", speakerStatus: "dismissed", promotedAt: null })
        .where(and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, targetId)));
    }
    await db.insert(meetingSignals).values({
      meetingId, senderId: member.id, recipientId: input.action === "mute" ? targetId : null,
      type: "stage", payload: { action: input.action, userId: targetId },
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
