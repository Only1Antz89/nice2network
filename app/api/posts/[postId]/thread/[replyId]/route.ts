import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { postReplies } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { requirePostView } from "@/lib/content-access";

const editSchema = z.object({ body: z.string().trim().min(1).max(2000) });

async function ownReply(memberId: string, postId: string, replyId: string) {
  await requirePostView(memberId, postId);
  const [reply] = await getDb()
    .select({ id: postReplies.id, authorId: postReplies.authorId })
    .from(postReplies)
    .where(and(eq(postReplies.id, replyId), eq(postReplies.postId, postId), eq(postReplies.status, "visible")))
    .limit(1);
  if (!reply) throw new ApiError(404, "Reply not found");
  if (reply.authorId !== memberId) throw new ApiError(403, "You can only change your own replies");
  return reply;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string; replyId: string }> }) {
  try {
    const member = await requireMember(), { postId, replyId } = await params;
    const input = editSchema.parse(await request.json());
    await ownReply(member.id, postId, replyId);
    const editedAt = new Date();
    const [reply] = await getDb().update(postReplies).set({ body: input.body, updatedAt: editedAt }).where(and(eq(postReplies.id, replyId), eq(postReplies.postId, postId), eq(postReplies.authorId, member.id), eq(postReplies.status, "visible"))).returning({ id: postReplies.id, body: postReplies.body });
    if (!reply) throw new ApiError(404, "Reply not found");
    return NextResponse.json({ reply: { ...reply, editedAt } });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ postId: string; replyId: string }> }) {
  try {
    const member = await requireMember(), { postId, replyId } = await params;
    await ownReply(member.id, postId, replyId);
    const [reply] = await getDb().update(postReplies).set({ body: "Reply deleted", status: "deleted", updatedAt: new Date() }).where(and(eq(postReplies.id, replyId), eq(postReplies.postId, postId), eq(postReplies.authorId, member.id), eq(postReplies.status, "visible"))).returning({ id: postReplies.id });
    if (!reply) throw new ApiError(404, "Reply not found");
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
