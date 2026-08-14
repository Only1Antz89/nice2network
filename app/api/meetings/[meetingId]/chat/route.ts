import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { meetingMessages, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { requireMeetingAccess } from "@/lib/meetings";

const messageSchema = z.object({ body: z.string().trim().min(1).max(1200) });

export async function GET(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const member = await requireMember();
    const { meetingId } = await params;
    await requireMeetingAccess(meetingId, member.id);
    const sinceValue = new URL(request.url).searchParams.get("since");
    const rows = await getDb().select({
      id: meetingMessages.id, body: meetingMessages.body, createdAt: meetingMessages.createdAt,
      author: { id: users.id, name: users.name, image: users.image, profession: users.profession },
    }).from(meetingMessages)
      .innerJoin(users, eq(users.id, meetingMessages.authorId))
      .where(and(eq(meetingMessages.meetingId, meetingId), isNull(meetingMessages.deletedAt), ...(sinceValue ? [gt(meetingMessages.createdAt, new Date(sinceValue))] : [])))
      .orderBy(asc(meetingMessages.createdAt)).limit(200);
    return NextResponse.json({ messages: rows, serverTime: new Date().toISOString() });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const member = await requireMember();
    const { meetingId } = await params;
    await requireMeetingAccess(meetingId, member.id);
    const input = messageSchema.parse(await request.json());
    const [message] = await getDb().insert(meetingMessages).values({ meetingId, authorId: member.id, body: input.body }).returning();
    return NextResponse.json(message, { status: 201 });
  } catch (error) { return apiError(error); }
}
