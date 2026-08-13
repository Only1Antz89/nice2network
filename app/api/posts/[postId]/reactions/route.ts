import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { postLikes, postReposts, timelinePosts } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { trackProductEvent } from "@/lib/analytics";

const schema=z.object({action:z.enum(["like","repost"])});

export async function POST(request:Request,{params}:{params:Promise<{postId:string}>}){
  try{
    const member=await requireMember(),{postId}=await params,{action}=schema.parse(await request.json()),db=getDb();
    const [post]=await db.select({id:timelinePosts.id,authorId:timelinePosts.authorId,body:timelinePosts.body}).from(timelinePosts).where(and(eq(timelinePosts.id,postId),eq(timelinePosts.status,"visible"))).limit(1);
    if(!post)return NextResponse.json({error:"Post not found"},{status:404});
    const table=action==="like"?postLikes:postReposts;
    const [existing]=await db.select({userId:table.userId}).from(table).where(and(eq(table.postId,postId),eq(table.userId,member.id))).limit(1);
    if(existing)await db.delete(table).where(and(eq(table.postId,postId),eq(table.userId,member.id)));else await db.insert(table).values({postId,userId:member.id});
    if(!existing)await createNotification({userId:post.authorId,actorId:member.id,type:"project",title:`${member.name??"Someone"} ${action==="like"?"liked":"reposted"} your post`,body:post.body.slice(0,120),entityType:"post",entityId:postId,href:`/?post=${postId}`});
    await trackProductEvent({actorId:member.id,event:`timeline_post_${action}${existing?"_removed":""}`,properties:{postId}});
    const [counts]=await db.select({likeCount:sql<number>`(select count(*)::int from ${postLikes} where ${postLikes.postId}=${postId})`,repostCount:sql<number>`(select count(*)::int from ${postReposts} where ${postReposts.postId}=${postId})`}).from(timelinePosts).where(eq(timelinePosts.id,postId)).limit(1);
    return NextResponse.json({active:!existing,...counts});
  }catch(error){return apiError(error)}
}
