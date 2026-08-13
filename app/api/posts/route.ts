import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { adminAssignments, postLikes, postReplies, postReposts, projects, timelinePosts, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { trackProductEvent } from "@/lib/analytics";
import { auth } from "@/auth";

const imageData = z.string().max(2_900_000).refine(value => /^data:image\/(jpeg|png|webp|gif);base64,/i.test(value), "Choose a JPEG, PNG, WebP or GIF image");
const videoData = z.string().max(3_500_000).refine(value => /^data:video\/(mp4|webm|quicktime);base64,/i.test(value), "Choose an MP4, WebM or QuickTime video");
const httpUrl = z.string().url().max(1000).refine(value => ["http:", "https:"].includes(new URL(value).protocol), "Use an http(s) video link");
const postSchema = z.object({
  body: z.string().trim().min(1).max(3000),
  linkedProjectIds: z.array(z.uuid()).max(8).default([]),
  attachmentType: z.enum(["image", "video"]).nullable().optional(),
  attachmentUrl: z.union([imageData, videoData]).nullable().optional(),
  videoUrl: httpUrl.nullable().optional(),
  visibility: z.enum(["network", "connections"]).default("network"),
}).refine(input => !input.attachmentType || Boolean(input.attachmentUrl), "Attachment data is missing");

export async function GET() {
  try {
    const db = getDb(), session = await auth(), viewerId = session?.user?.id;
    const rows = await db.select({
      id: timelinePosts.id, body: timelinePosts.body, linkedProjectIds: timelinePosts.linkedProjectIds,
      attachmentType: timelinePosts.attachmentType, attachmentUrl: timelinePosts.attachmentUrl, videoUrl: timelinePosts.videoUrl,
      visibility: timelinePosts.visibility, createdAt: timelinePosts.createdAt, authorId: users.id, authorName: users.name,
      authorImage: users.image, authorProfession: users.profession,
      authorIsAdmin: sql<boolean>`case when ${adminAssignments.status} = 'active' then true else false end`,
      isDemo: sql<boolean>`${users.role} = 'demo_member'`,
      replyCount: sql<number>`(select count(*)::int from ${postReplies} where ${postReplies.postId} = ${timelinePosts.id} and ${postReplies.status} = 'visible')`,
      likeCount: sql<number>`(select count(*)::int from ${postLikes} where ${postLikes.postId} = ${timelinePosts.id})`,
      repostCount: sql<number>`(select count(*)::int from ${postReposts} where ${postReposts.postId} = ${timelinePosts.id})`,
      liked: viewerId ? sql<boolean>`exists(select 1 from ${postLikes} where ${postLikes.postId} = ${timelinePosts.id} and ${postLikes.userId} = ${viewerId})` : sql<boolean>`false`,
      reposted: viewerId ? sql<boolean>`exists(select 1 from ${postReposts} where ${postReposts.postId} = ${timelinePosts.id} and ${postReposts.userId} = ${viewerId})` : sql<boolean>`false`,
    }).from(timelinePosts).innerJoin(users, eq(users.id, timelinePosts.authorId))
      .leftJoin(adminAssignments, and(eq(adminAssignments.userId, users.id), eq(adminAssignments.status, "active")))
      .where(and(eq(timelinePosts.status, "visible"), eq(timelinePosts.visibility, "network"), eq(users.status, "active")))
      .orderBy(desc(timelinePosts.createdAt)).limit(60);
    const ids = [...new Set(rows.flatMap(row => row.linkedProjectIds))];
    const linked = ids.length ? await db.select({ id: projects.id, title: projects.title, status: projects.status }).from(projects).where(inArray(projects.id, ids)) : [];
    const byId = new Map(linked.map(project => [project.id, project]));
    return NextResponse.json({ posts: rows.map(row => ({ ...row, linkedProjects: row.linkedProjectIds.map(id => byId.get(id)).filter(Boolean) })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(), input = postSchema.parse(await request.json()), db = getDb();
    if (input.linkedProjectIds.length) {
      const visible = await db.select({ id: projects.id }).from(projects).where(and(inArray(projects.id, input.linkedProjectIds), eq(projects.status, "active"), eq(projects.visibility, "network")));
      if (visible.length !== input.linkedProjectIds.length) return NextResponse.json({ error: "One of the linked projects is no longer available" }, { status: 400 });
    }
    const [post] = await db.insert(timelinePosts).values({ authorId: member.id, body: input.body, linkedProjectIds: input.linkedProjectIds, attachmentType: input.attachmentType ?? null, attachmentUrl: input.attachmentUrl ?? null, videoUrl: input.videoUrl ?? null, visibility: input.visibility }).returning();
    await audit(member.id, "timeline.post_created", "post", post.id, { linkedProjectCount: input.linkedProjectIds.length, hasMedia: Boolean(input.attachmentUrl || input.videoUrl) });
    await trackProductEvent({ actorId: member.id, event: "timeline_post_created", properties: { linkedProjects: input.linkedProjectIds.length, media: input.attachmentType ?? (input.videoUrl ? "video_link" : "none") } });
    return NextResponse.json({ post: { ...post, authorId: member.id, authorName: member.name, authorImage: member.image, authorProfession: null, authorIsAdmin: member.isN2Admin, linkedProjects: [], replyCount:0, likeCount:0, repostCount:0, liked:false, reposted:false } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
