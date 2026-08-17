import { and, asc, eq, gt, isNull, ne, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { meetingParticipants, meetingSignals, meetings, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { requireMeetingAccess } from "@/lib/meetings";

const schema = z.object({
  recipientId: z.uuid().nullable().optional(),
  type: z.enum(["join", "heartbeat", "offer", "answer", "ice", "media", "leave", "end", "stage"]),
  payload: z.record(z.string(), z.unknown()).default({}),
}).refine((value) => JSON.stringify(value.payload).length <= 64_000, "Signal payload is too large");

export async function GET(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const member = await requireMember();
    const { meetingId } = await params;
    await requireMeetingAccess(meetingId, member.id);
    const sinceValue = Number(new URL(request.url).searchParams.get("since") ?? Date.now() - 30000);
    const since = new Date(Number.isFinite(sinceValue) ? sinceValue : Date.now() - 30000);
    const rows = await getDb().select({
      id: meetingSignals.id,
      meetingId: meetingSignals.meetingId,
      senderId: meetingSignals.senderId,
      recipientId: meetingSignals.recipientId,
      type: meetingSignals.type,
      payload: meetingSignals.payload,
      createdAt: meetingSignals.createdAt,
      sender: {
        id: users.id,
        name: users.name,
        image: users.image,
        profession: users.profession,
        professionalHeadline: users.headline,
        city: users.city,
        role: meetingParticipants.role,
        speakerStatus: meetingParticipants.speakerStatus,
        status: meetingParticipants.status,
      },
    }).from(meetingSignals)
      .innerJoin(users, eq(users.id, meetingSignals.senderId))
      .innerJoin(meetingParticipants, and(
        eq(meetingParticipants.meetingId, meetingSignals.meetingId),
        eq(meetingParticipants.userId, meetingSignals.senderId),
      ))
      .where(and(
        eq(meetingSignals.meetingId, meetingId),
        ne(meetingSignals.senderId, member.id),
        gt(meetingSignals.createdAt, since),
        or(eq(meetingSignals.recipientId, member.id), isNull(meetingSignals.recipientId)),
      ))
      .orderBy(asc(meetingSignals.createdAt))
      .limit(150);
    return NextResponse.json({ signals: rows, serverTime: Date.now() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const member = await requireMember();
    const { meetingId } = await params;
    const input = schema.parse(await request.json());
    const db = getDb();
    const meeting = await requireMeetingAccess(meetingId, member.id);
    if (meeting.mode === "in_person") throw new ApiError(400, "In-person meets do not have an online room");
    if (meeting.endedAt && input.type !== "end") throw new ApiError(410, "This meet has ended");
    if (input.type === "end" && meeting.createdBy !== member.id) throw new ApiError(403, "Only the meet host can end it");
    const active = await db.selectDistinct({ senderId: meetingSignals.senderId }).from(meetingSignals).where(and(eq(meetingSignals.meetingId, meetingId), gt(meetingSignals.createdAt, new Date(Date.now() - 45000))));
    if (input.type === "join" && active.length >= meeting.maxParticipants && !active.some(row => row.senderId === member.id)) throw new ApiError(409, `This room is full (${meeting.maxParticipants} people)`);

    const now = new Date();
    if (["join", "heartbeat", "media"].includes(input.type)) {
      await db.insert(meetingParticipants).values({
        meetingId,
        userId: member.id,
        status: "joined",
        joinedAt: now,
        lastSeenAt: now,
      }).onConflictDoUpdate({
        target: [meetingParticipants.meetingId, meetingParticipants.userId],
        set: { status: "joined", lastSeenAt: now },
      });
    } else if (input.type === "leave") {
      await db.update(meetingParticipants).set({ status: "left", lastSeenAt: now }).where(and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, member.id)));
    }
    if (input.type === "end") {
      await db.transaction(async tx => {
        await tx.update(meetings).set({ endedAt: now, updatedAt: now }).where(eq(meetings.id, meetingId));
        await tx.update(meetingParticipants).set({ status: "left", lastSeenAt: now }).where(eq(meetingParticipants.meetingId, meetingId));
      });
    }
    const [signal] = await db.insert(meetingSignals).values({ meetingId, senderId: member.id, recipientId: input.recipientId ?? null, type: input.type, payload: input.payload }).returning();
    return NextResponse.json(signal, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
