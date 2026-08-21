import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projects, timelinePosts } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";

const imageData = z.string().max(2_900_000).refine(value => /^data:image\/(jpeg|png|webp|gif);base64,/i.test(value), "Choose a JPEG, PNG, WebP or GIF image");
const videoData = z.string().max(3_500_000).refine(value => /^data:video\/(mp4|webm|quicktime);base64,/i.test(value), "Choose an MP4, WebM or QuickTime video");
const httpUrl = z.string().url().max(1000).refine(value => ["http:", "https:"].includes(new URL(value).protocol), "Use an http(s) link");

const updateSchema = z.object({
  body: z.string().trim().min(1).max(1000).optional(),
  visibility: z.enum(["network", "connections"]).optional(),
  linkedProjectIds: z.array(z.uuid()).max(8).optional(),
  attachmentType: z.enum(["image", "video"]).nullable().optional(),
  attachmentUrl: z.union([imageData, videoData]).nullable().optional(),
  videoUrl: httpUrl.nullable().optional(),
}).refine(input => Object.values(input).some(value => value !== undefined), "Choose something to update")
  .refine(input => !input.attachmentType || Boolean(input.attachmentUrl), "Attachment data is missing");

async function ownedPost(postId: string, userId: string) {
  const [post] = await getDb().select().from(timelinePosts).where(and(eq(timelinePosts.id, postId), eq(timelinePosts.status, "visible"))).limit(1);
  if (!post) throw new ApiError(404, "Post not found");
  if (post.authorId !== userId) throw new ApiError(403, "Only the post owner can change this post");
  return post;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const member = await requireMember(), { postId } = await params, input = updateSchema.parse(await request.json()), db = getDb();
    const owned = await ownedPost(postId, member.id);
    if (owned.kind === "birthday" && input.visibility !== undefined) throw new ApiError(400, "Birthday post audience is managed by your birthday privacy setting");
    if (input.linkedProjectIds?.length) {
      const visible = await db.select({ id: projects.id }).from(projects).where(and(inArray(projects.id, input.linkedProjectIds), eq(projects.status, "active"), eq(projects.visibility, "network")));
      if (visible.length !== input.linkedProjectIds.length) return NextResponse.json({ error: "One of the linked projects is no longer available" }, { status: 400 });
    }
    const [post] = await db.update(timelinePosts).set({ ...input, updatedAt: new Date() }).where(eq(timelinePosts.id, postId)).returning();
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
