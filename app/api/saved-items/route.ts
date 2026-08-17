import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { meetings, projectComments, projects, savedItems, timelinePosts, users } from "@/db/schema";
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

export async function GET(){
  try{
    const member=await requireMember(),db=getDb();
    const saved=await db.select().from(savedItems).where(and(eq(savedItems.userId,member.id),or(eq(savedItems.bookmarked,true),eq(savedItems.pinned,true)))).orderBy(desc(savedItems.pinned),desc(savedItems.updatedAt)).limit(200);
    const visibleSaved=(await Promise.all(saved.map(async item=>{try{await assertVisible(member.id,item.entityType as "project"|"comment"|"meeting"|"post",item.entityId);return item}catch{return null}}))).filter((item):item is typeof saved[number]=>Boolean(item));
    const projectIds=visibleSaved.filter(item=>item.entityType==="project").map(item=>item.entityId),commentIds=visibleSaved.filter(item=>item.entityType==="comment").map(item=>item.entityId),meetingIds=visibleSaved.filter(item=>item.entityType==="meeting").map(item=>item.entityId),postIds=visibleSaved.filter(item=>item.entityType==="post").map(item=>item.entityId);
    const [projectRows,commentRows,meetingRows,postRows]=await Promise.all([
      projectIds.length?db.select({id:projects.id,title:projects.title,summary:projects.summary,accent:projects.accent}).from(projects).where(inArray(projects.id,projectIds)):[],
      commentIds.length?db.select({id:projectComments.id,body:projectComments.body,projectTitle:projects.title,authorName:users.name}).from(projectComments).innerJoin(projects,eq(projects.id,projectComments.projectId)).innerJoin(users,eq(users.id,projectComments.authorId)).where(inArray(projectComments.id,commentIds)):[],
      meetingIds.length?db.select({id:meetings.id,title:meetings.title,startsAt:meetings.startsAt,provider:meetings.provider}).from(meetings).where(inArray(meetings.id,meetingIds)):[],
      postIds.length?db.select({id:timelinePosts.id,body:timelinePosts.body,attachmentType:timelinePosts.attachmentType,attachmentUrl:timelinePosts.attachmentUrl}).from(timelinePosts).where(and(inArray(timelinePosts.id,postIds),eq(timelinePosts.status,"visible"))):[],
    ]);
    const details=new Map<string,Record<string,unknown>>([...projectRows.map(row=>[`project:${row.id}`,row] as const),...commentRows.map(row=>[`comment:${row.id}`,row] as const),...meetingRows.map(row=>[`meeting:${row.id}`,row] as const),...postRows.map(row=>[`post:${row.id}`,row] as const)]);
    return NextResponse.json({items:visibleSaved.map(item=>({...item,details:details.get(`${item.entityType}:${item.entityId}`)??null})).filter(item=>item.details),pinCount:visibleSaved.filter(item=>item.pinned).length});
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
