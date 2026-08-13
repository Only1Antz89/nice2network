import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { timelinePosts } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";

const updateSchema = z.object({
  body: z.string().trim().min(1).max(3000).optional(),
  visibility: z.enum(["network", "connections"]).optional(),
}).refine(input => input.body !== undefined || input.visibility !== undefined, "Choose something to update");

async function ownedPost(postId: string, userId: string) {
  const [post] = await getDb().select().from(timelinePosts).where(and(eq(timelinePosts.id, postId), eq(timelinePosts.status, "visible"))).limit(1);
  if (!post) throw new ApiError(404, "Post not found");
  if (post.authorId !== userId) throw new ApiError(403, "Only the post owner can change this post");
  return post;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const member = await requireMember(), { postId } = await params, input = updateSchema.parse(await request.json());
    await ownedPost(postId, member.id);
    const [post] = await getDb().update(timelinePosts).set({ ...input, updatedAt: new Date() }).where(eq(timelinePosts.id, postId)).returning();
    await audit(member.id, "timeline.post_updated", "post", postId, { fields: Object.keys(input) });
    return NextResponse.json({ post });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const member = await requireMember(), { postId } = await params;
    await ownedPost(postId, member.id);
    await getDb().update(timelinePosts).set({ status: "deleted", updatedAt: new Date() }).where(eq(timelinePosts.id, postId));
    await audit(member.id, "timeline.post_deleted", "post", postId);
    return NextResponse.json({ deleted: true });
  } catch (error) { return apiError(error); }
}
