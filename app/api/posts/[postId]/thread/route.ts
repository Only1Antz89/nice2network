import { and, asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { adminAssignments, postLikes, postReplies, postReposts, timelinePosts, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { trackProductEvent } from "@/lib/analytics";

const replySchema = z.object({ body: z.string().trim().min(1).max(2000) });

export async function GET(_request:Request,{params}:{params:Promise<{postId:string}>}) {
  try {
    const member=await requireMember(), {postId}=await params, db=getDb();
    const [post]=await db.select({
      id:timelinePosts.id,body:timelinePosts.body,createdAt:timelinePosts.createdAt,authorId:users.id,authorName:users.name,authorImage:users.image,authorProfession:users.profession,
      authorIsAdmin:sql<boolean>`case when ${adminAssignments.status} = 'active' then true else false end`,isDemo:sql<boolean>`${users.role} = 'demo_member'`,
      replyCount:sql<number>`(select count(*)::int from ${postReplies} where ${postReplies.postId}=${timelinePosts.id} and ${postReplies.status}='visible')`,
      likeCount:sql<number>`(select count(*)::int from ${postLikes} where ${postLikes.postId}=${timelinePosts.id})`,repostCount:sql<number>`(select count(*)::int from ${postReposts} where ${postReposts.postId}=${timelinePosts.id})`,
      liked:sql<boolean>`exists(select 1 from ${postLikes} where ${postLikes.postId}=${timelinePosts.id} and ${postLikes.userId}=${member.id})`,reposted:sql<boolean>`exists(select 1 from ${postReposts} where ${postReposts.postId}=${timelinePosts.id} and ${postReposts.userId}=${member.id})`,
    }).from(timelinePosts).innerJoin(users,eq(users.id,timelinePosts.authorId)).leftJoin(adminAssignments,and(eq(adminAssignments.userId,users.id),eq(adminAssignments.status,"active"))).where(and(eq(timelinePosts.id,postId),eq(timelinePosts.status,"visible"))).limit(1);
    if(!post)return NextResponse.json({error:"Post not found"},{status:404});
    const replies=await db.select({id:postReplies.id,body:postReplies.body,createdAt:postReplies.createdAt,authorId:users.id,authorName:users.name,authorImage:users.image,authorProfession:users.profession,isDemo:postReplies.isDemo,authorIsAdmin:sql<boolean>`case when ${adminAssignments.status} = 'active' then true else false end`}).from(postReplies).innerJoin(users,eq(users.id,postReplies.authorId)).leftJoin(adminAssignments,and(eq(adminAssignments.userId,users.id),eq(adminAssignments.status,"active"))).where(and(eq(postReplies.postId,postId),eq(postReplies.status,"visible"),eq(users.status,"active"))).orderBy(asc(postReplies.createdAt));
    return NextResponse.json({post,replies});
  } catch(error){return apiError(error)}
}

export async function POST(request:Request,{params}:{params:Promise<{postId:string}>}) {
  try {
    const member=await requireMember(), {postId}=await params, input=replySchema.parse(await request.json()), db=getDb();
    const [post]=await db.select({id:timelinePosts.id,authorId:timelinePosts.authorId}).from(timelinePosts).where(and(eq(timelinePosts.id,postId),eq(timelinePosts.status,"visible"))).limit(1);
    if(!post)return NextResponse.json({error:"Post not found"},{status:404});
    const [reply]=await db.insert(postReplies).values({postId,authorId:member.id,body:input.body}).returning();
    await createNotification({userId:post.authorId,actorId:member.id,type:"project",title:`${member.name??"Someone"} replied to your post`,body:input.body.slice(0,120),entityType:"post",entityId:postId,href:`/?post=${postId}`});
    await trackProductEvent({actorId:member.id,event:"timeline_post_reply",properties:{postId}});
    return NextResponse.json({reply:{...reply,authorName:member.name,authorImage:member.image,authorProfession:null,authorIsAdmin:member.isN2Admin}},{status:201});
  } catch(error){return apiError(error)}
}
