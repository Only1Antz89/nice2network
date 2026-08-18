import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { follows, meetings, privacySettings, projectComments, projects, savedItems, timelinePosts, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";
import { requirePostView, requireProjectView } from "@/lib/content-access";
import { requireMeetingAccess } from "@/lib/meetings";

const inputSchema=z.object({entityType:z.enum(["project","comment","meeting","post"]),entityId:z.uuid(),action:z.enum(["pin","bookmark"])});

async function assertVisible(userId:string,entityType:"project"|"comment"|"meeting"|"post",entityId:string){
  const db=getDb();
  if(entityType==="project"){
    await requireProjectView(userId,entityId);
    return;
  }
  if(entityType==="comment"){
    const [comment]=await db.select({id:projectComments.id,visibility:projects.visibility,ownerId:projects.ownerId,projectId:projects.id}).from(projectComments).innerJoin(projects,eq(projects.id,projectComments.projectId)).where(and(eq(projectComments.id,entityId),eq(projectComments.status,"visible"))).limit(1);
    if(!comment)throw new ApiError(404,"Comment not found");
    await requireProjectView(userId,comment.projectId);
    return;
  }
  if(entityType==="post"){
    await requirePostView(userId,entityId);
    return;
  }
  await requireMeetingAccess(entityId,userId);
}

export async function GET(request:Request){
  try{
    const member=await requireMember(),db=getDb(),targetId=new URL(request.url).searchParams.get("profile")??member.id,isPublicPins=targetId!==member.id;
    if(isPublicPins){
      const [target]=await db.select({id:users.id,visibility:privacySettings.profileVisibility}).from(users).leftJoin(privacySettings,eq(privacySettings.userId,users.id)).where(and(eq(users.id,targetId),eq(users.status,"active"))).limit(1);
      if(!target)throw new ApiError(404,"Profile not found");
      if(target.visibility==="private")throw new ApiError(403,"This profile is private");
      if(target.visibility==="connections"){
        const directions=await db.select({followerId:follows.followerId,followingId:follows.followingId}).from(follows).where(or(and(eq(follows.followerId,member.id),eq(follows.followingId,targetId)),and(eq(follows.followerId,targetId),eq(follows.followingId,member.id))));
        const mutual=directions.some(row=>row.followerId===member.id)&&directions.some(row=>row.followerId===targetId);
        if(!mutual)throw new ApiError(403,"This profile is visible to mutual connections");
      }
    }
    const saved=await db.select().from(savedItems).where(and(eq(savedItems.userId,targetId),isPublicPins?eq(savedItems.pinned,true):or(eq(savedItems.bookmarked,true),eq(savedItems.pinned,true)))).orderBy(desc(savedItems.pinned),desc(savedItems.updatedAt)).limit(isPublicPins?3:200);
    const visibleSaved=(await Promise.all(saved.map(async item=>{try{await assertVisible(member.id,item.entityType as "project"|"comment"|"meeting"|"post",item.entityId);return item}catch{return null}}))).filter((item):item is typeof saved[number]=>Boolean(item));
    const projectIds=visibleSaved.filter(item=>item.entityType==="project").map(item=>item.entityId),commentIds=visibleSaved.filter(item=>item.entityType==="comment").map(item=>item.entityId),meetingIds=visibleSaved.filter(item=>item.entityType==="meeting").map(item=>item.entityId),postIds=visibleSaved.filter(item=>item.entityType==="post").map(item=>item.entityId);
    const [projectRows,commentRows,meetingRows,postRows]=await Promise.all([
      projectIds.length?db.select({id:projects.id,title:projects.title,summary:projects.summary,accent:projects.accent,industry:projects.industry,stage:projects.stage,ownerName:users.name,ownerImage:users.image,createdAt:projects.createdAt}).from(projects).innerJoin(users,eq(users.id,projects.ownerId)).where(inArray(projects.id,projectIds)):[],
      commentIds.length?db.select({id:projectComments.id,body:projectComments.body,projectId:projects.id,projectTitle:projects.title,authorName:users.name,authorImage:users.image,createdAt:projectComments.createdAt}).from(projectComments).innerJoin(projects,eq(projects.id,projectComments.projectId)).innerJoin(users,eq(users.id,projectComments.authorId)).where(inArray(projectComments.id,commentIds)):[],
      meetingIds.length?db.select({id:meetings.id,title:meetings.title,description:meetings.description,startsAt:meetings.startsAt,endsAt:meetings.endsAt,provider:meetings.provider,mode:meetings.mode,location:meetings.location,thumbnailUrl:meetings.thumbnailUrl,hostName:users.name,hostImage:users.image}).from(meetings).innerJoin(users,eq(users.id,meetings.createdBy)).where(inArray(meetings.id,meetingIds)):[],
      postIds.length?db.select({id:timelinePosts.id,body:timelinePosts.body,attachmentType:timelinePosts.attachmentType,attachmentUrl:timelinePosts.attachmentUrl,videoUrl:timelinePosts.videoUrl,createdAt:timelinePosts.createdAt,authorName:users.name,authorImage:users.image}).from(timelinePosts).innerJoin(users,eq(users.id,timelinePosts.authorId)).where(and(inArray(timelinePosts.id,postIds),eq(timelinePosts.status,"visible"))):[],
    ]);
    const details=new Map<string,Record<string,unknown>>([...projectRows.map(row=>[`project:${row.id}`,row] as const),...commentRows.map(row=>[`comment:${row.id}`,row] as const),...meetingRows.map(row=>[`meeting:${row.id}`,row] as const),...postRows.map(row=>[`post:${row.id}`,row] as const)]);
    return NextResponse.json({items:visibleSaved.map(item=>{const detail=details.get(`${item.entityType}:${item.entityId}`)??null;return {...item,details:detail,href:item.entityType==="project"?`/?view=projects&project=${item.entityId}`:item.entityType==="comment"&&detail?.projectId?`/?view=projects&project=${detail.projectId}`:item.entityType==="meeting"?`/?view=meet&meeting=${item.entityId}`:`/?post=${item.entityId}`}}).filter(item=>item.details),pinCount:visibleSaved.filter(item=>item.pinned).length});
  }catch(error){return apiError(error)}
}

export async function PATCH(request:Request){
  try{
    const member=await requireMember(),input=inputSchema.parse(await request.json()),db=getDb();
    await assertVisible(member.id,input.entityType,input.entityId);
    const next=await db.transaction(async tx=>{
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${member.id}))`);
      const [current]=await tx.select().from(savedItems).where(and(eq(savedItems.userId,member.id),eq(savedItems.entityType,input.entityType),eq(savedItems.entityId,input.entityId))).limit(1);
      const value=input.action==="pin"?{pinned:!current?.pinned,bookmarked:current?.bookmarked??false}:{pinned:current?.pinned??false,bookmarked:!current?.bookmarked};
      if(input.action==="pin"&&value.pinned){const [pins]=await tx.select({value:count()}).from(savedItems).where(and(eq(savedItems.userId,member.id),eq(savedItems.pinned,true)));if(Number(pins?.value??0)>=3)throw new ApiError(409,"You can pin up to three items. Unpin one before adding another.")}
      await tx.insert(savedItems).values({userId:member.id,entityType:input.entityType,entityId:input.entityId,...value}).onConflictDoUpdate({target:[savedItems.userId,savedItems.entityType,savedItems.entityId],set:{...value,updatedAt:new Date()}});
      return value;
    });
    await trackProductEvent({actorId:member.id,event:`saved_item_${input.action}`,entityType:input.entityType,entityId:input.entityId,properties:{active:input.action==="pin"?next.pinned:next.bookmarked}});
    return NextResponse.json(next);
  }catch(error){return apiError(error)}
}
