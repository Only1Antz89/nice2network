import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { meetingMessages, meetingParticipants, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { requireMeetingAccess } from "@/lib/meetings";

const QUESTION_PREFIX = "[[n2-question]]";
const messageSchema = z.object({ body: z.string().trim().min(1).max(1200), kind: z.enum(["message", "question"]).default("message") });

export async function GET(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const member = await requireMember();
    const { meetingId } = await params;
    const meeting = await requireMeetingAccess(meetingId, member.id);
    const sinceValue = new URL(request.url).searchParams.get("since");
    const rows = await getDb().select({
      id: meetingMessages.id, body: meetingMessages.body, createdAt: meetingMessages.createdAt,
      author: { id: users.id, name: users.name, image: users.image, profession: users.profession },
    }).from(meetingMessages)
      .innerJoin(users, eq(users.id, meetingMessages.authorId))
      .where(and(eq(meetingMessages.meetingId, meetingId), isNull(meetingMessages.deletedAt), ...(sinceValue ? [gt(meetingMessages.createdAt, new Date(sinceValue))] : [])))
      .orderBy(asc(meetingMessages.createdAt)).limit(200);
    const [participant] = await getDb().select({ role: meetingParticipants.role }).from(meetingParticipants)
      .where(and(eq(meetingParticipants.meetingId, meetingId), eq(meetingParticipants.userId, member.id))).limit(1);
    const canSeeQuestions = meeting.createdBy === member.id || participant?.role === "cohost";
    const visible = rows.flatMap(row => {
      const question = row.body.startsWith(QUESTION_PREFIX);
      if (question && !canSeeQuestions && row.author.id !== member.id) return [];
      return [{ ...row, body: question ? row.body.slice(QUESTION_PREFIX.length) : row.body, kind: question ? "question" : "message" }];
    });
    return NextResponse.json({ messages: visible, serverTime: new Date().toISOString() });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const member = await requireMember();
    const { meetingId } = await params;
    await requireMeetingAccess(meetingId, member.id);
    const input = messageSchema.parse(await request.json());
    const body = input.kind === "question" ? `${QUESTION_PREFIX}${input.body}` : input.body;
    const [message] = await getDb().insert(meetingMessages).values({ meetingId, authorId: member.id, body }).returning();
    return NextResponse.json(message, { status: 201 });
  } catch (error) { return apiError(error); }
}
