import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { meetings, projectComments, projectMembers, projects, savedItems, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";

const inputSchema=z.object({entityType:z.enum(["project","comment","meeting"]),entityId:z.uuid(),action:z.enum(["pin","bookmark"])});

async function assertVisible(userId:string,entityType:"project"|"comment"|"meeting",entityId:string){
  const db=getDb();
  if(entityType==="project"){
    const [project]=await db.select({id:projects.id,ownerId:projects.ownerId,visibility:projects.visibility}).from(projects).where(eq(projects.id,entityId)).limit(1);
    if(!project)throw new ApiError(404,"Project not found");
    if(project.visibility==="private"&&project.ownerId!==userId){const [membership]=await db.select({userId:projectMembers.userId}).from(projectMembers).where(and(eq(projectMembers.projectId,entityId),eq(projectMembers.userId,userId))).limit(1);if(!membership)throw new ApiError(404,"Project not found")}
    return;
  }
  if(entityType==="comment"){
    const [comment]=await db.select({id:projectComments.id,visibility:projects.visibility,ownerId:projects.ownerId,projectId:projects.id}).from(projectComments).innerJoin(projects,eq(projects.id,projectComments.projectId)).where(and(eq(projectComments.id,entityId),eq(projectComments.status,"visible"))).limit(1);
    if(!comment)throw new ApiError(404,"Comment not found");
    if(comment.visibility==="private"&&comment.ownerId!==userId){const [membership]=await db.select({userId:projectMembers.userId}).from(projectMembers).where(and(eq(projectMembers.projectId,comment.projectId),eq(projectMembers.userId,userId))).limit(1);if(!membership)throw new ApiError(404,"Comment not found")}
    return;
  }
  const [meeting]=await db.select({id:meetings.id}).from(meetings).where(eq(meetings.id,entityId)).limit(1);
  if(!meeting)throw new ApiError(404,"Meet not found");
}

export async function GET(){
  try{
    const member=await requireMember(),db=getDb();
    const saved=await db.select().from(savedItems).where(and(eq(savedItems.userId,member.id),or(eq(savedItems.bookmarked,true),eq(savedItems.pinned,true)))).orderBy(desc(savedItems.pinned),desc(savedItems.updatedAt)).limit(200);
    const projectIds=saved.filter(item=>item.entityType==="project").map(item=>item.entityId),commentIds=saved.filter(item=>item.entityType==="comment").map(item=>item.entityId),meetingIds=saved.filter(item=>item.entityType==="meeting").map(item=>item.entityId);
    const [projectRows,commentRows,meetingRows]=await Promise.all([
      projectIds.length?db.select({id:projects.id,title:projects.title,summary:projects.summary,accent:projects.accent}).from(projects).where(inArray(projects.id,projectIds)):[],
      commentIds.length?db.select({id:projectComments.id,body:projectComments.body,projectTitle:projects.title,authorName:users.name}).from(projectComments).innerJoin(projects,eq(projects.id,projectComments.projectId)).innerJoin(users,eq(users.id,projectComments.authorId)).where(inArray(projectComments.id,commentIds)):[],
      meetingIds.length?db.select({id:meetings.id,title:meetings.title,startsAt:meetings.startsAt,provider:meetings.provider}).from(meetings).where(inArray(meetings.id,meetingIds)):[],
    ]);
    const details=new Map<string,Record<string,unknown>>([...projectRows.map(row=>[`project:${row.id}`,row] as const),...commentRows.map(row=>[`comment:${row.id}`,row] as const),...meetingRows.map(row=>[`meeting:${row.id}`,row] as const)]);
    return NextResponse.json({items:saved.map(item=>({...item,details:details.get(`${item.entityType}:${item.entityId}`)??null})).filter(item=>item.details),pinCount:saved.filter(item=>item.pinned).length});
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
