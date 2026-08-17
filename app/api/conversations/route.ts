import { and, count, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { adminAssignments, conversationMembers, conversations, follows, notifications, privacySettings, projectMembers, safetyRisks, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";
import { getMessageEligibility } from "@/lib/messaging-permissions";

const createSchema = z.object({ recipientIds: z.array(z.uuid()).min(1).max(7), projectId: z.uuid().optional(), name: z.string().trim().max(100).optional() });
const actionSchema = z.object({
  conversationId: z.uuid(),
  action: z.enum(["archive","restore","snooze","delete","rename","set_image","add_member"]),
  until: z.iso.datetime().optional(),
  name: z.string().trim().max(100).optional(),
  image: z.string().max(2_900_000).refine(value => /^data:image\//.test(value)).nullable().optional(),
  userId: z.uuid().optional(),
});

export async function GET() {
  try {
    const member=await requireMember(),db=getDb();
    const rows=await db.select({id:conversations.id,name:conversations.name,image:conversations.image,projectId:conversations.projectId,status:conversations.status,updatedAt:conversations.updatedAt,archivedAt:conversationMembers.archivedAt,snoozedUntil:conversationMembers.snoozedUntil})
      .from(conversationMembers).innerJoin(conversations,eq(conversations.id,conversationMembers.conversationId)).where(and(eq(conversationMembers.userId,member.id),ne(conversations.status,"deleted"))).orderBy(desc(conversations.updatedAt));
    const ids=rows.map(row=>row.id);if(!ids.length)return NextResponse.json({conversations:[]});
    const [members,lastMessages,unreadMessages]=await Promise.all([
      db.select({conversationId:conversationMembers.conversationId,userId:users.id,name:users.name,image:users.image,profession:users.profession}).from(conversationMembers).innerJoin(users,eq(users.id,conversationMembers.userId)).where(inArray(conversationMembers.conversationId,ids)),
      db.execute(sql`select distinct on (conversation_id) conversation_id,id,body,created_at from messages where conversation_id in (${sql.join(ids.map(id=>sql`${id}::uuid`),sql`, `)}) and status='visible' order by conversation_id,created_at desc`),
      db.select({conversationId:notifications.entityId,value:count()}).from(notifications).where(and(eq(notifications.userId,member.id),eq(notifications.type,"message"),eq(notifications.entityType,"conversation"),isNull(notifications.readAt),inArray(notifications.entityId,ids))).groupBy(notifications.entityId),
    ]);
    return NextResponse.json({conversations:rows.map(row=>({ ...row,members:members.filter(item=>item.conversationId===row.id),lastMessage:lastMessages.find(item=>item.conversation_id===row.id)??null,unreadCount:unreadMessages.find(item=>item.conversationId===row.id)?.value??0 }))});
  } catch(error){return apiError(error)}
}

export async function POST(request:Request){
  try{const member=await requireMember(),input=createSchema.parse(await request.json()),db=getDb(),recipientIds=[...new Set(input.recipientIds)].filter(id=>id!==member.id);if(!recipientIds.length)throw new ApiError(400,"Choose another member");
    const profiles=await db.select({id:users.id,ageBand:users.ageBand,messagePermission:privacySettings.messagePermission,isN2Admin:sql<boolean>`case when ${adminAssignments.status} = 'active' then true else false end`}).from(users).leftJoin(privacySettings,eq(privacySettings.userId,users.id)).leftJoin(adminAssignments,eq(adminAssignments.userId,users.id)).where(and(inArray(users.id,recipientIds),eq(users.status,"active")));if(profiles.length!==recipientIds.length)throw new ApiError(404,"One or more members are unavailable");
    const senderProjects=await db.select({projectId:projectMembers.projectId}).from(projectMembers).where(eq(projectMembers.userId,member.id)),sharedRows=senderProjects.length?await db.select({userId:projectMembers.userId,projectId:projectMembers.projectId}).from(projectMembers).where(and(inArray(projectMembers.userId,recipientIds),inArray(projectMembers.projectId,senderProjects.map(row=>row.projectId)))):[],mutualRows=await db.select({followerId:follows.followerId,followingId:follows.followingId}).from(follows).where(or(and(eq(follows.followerId,member.id),inArray(follows.followingId,recipientIds)),and(inArray(follows.followerId,recipientIds),eq(follows.followingId,member.id))));
    const [sender]=await db.select({ageBand:users.ageBand,isN2Admin:sql<boolean>`case when ${adminAssignments.status} = 'active' then true else false end`}).from(users).leftJoin(adminAssignments,eq(adminAssignments.userId,users.id)).where(eq(users.id,member.id)).limit(1);
    for(const profile of profiles){const shared=sharedRows.some(row=>row.userId===profile.id),outbound=mutualRows.some(row=>row.followerId===member.id&&row.followingId===profile.id),inbound=mutualRows.some(row=>row.followerId===profile.id&&row.followingId===member.id),mutual=outbound&&inbound,eligibility=getMessageEligibility({permission:profile.messagePermission,sharedProject:shared,mutual,senderIsAdmin:Boolean(sender?.isN2Admin),recipientIsAdmin:Boolean(profile.isN2Admin)});if(!eligibility.canMessage)throw new ApiError(403,eligibility.reason==="Not accepting new messages"?"One or more members are not accepting new messages":"Follow each other or join a shared project before starting a conversation")}
    const mixed=profiles.some(p=>p.ageBand!==sender?.ageBand&&[p.ageBand,sender?.ageBand].includes("teen_16_17"));if(mixed&&!input.projectId){await db.insert(safetyRisks).values({subjectUserId:sender?.ageBand==="teen_16_17"?member.id:null,type:"adult_teen_contact_blocked",severity:"high",details:{attemptedBy:member.id}});throw new ApiError(403,"Adult and teen contact requires a shared project")}
    if(mixed&&input.projectId){const shared=await db.select({userId:projectMembers.userId}).from(projectMembers).where(and(eq(projectMembers.projectId,input.projectId),inArray(projectMembers.userId,[member.id,...recipientIds])));if(shared.length!==recipientIds.length+1)throw new ApiError(403,"All members need the shared project")}
    const [conversation]=await db.transaction(async tx=>{const created=await tx.insert(conversations).values({initiatedBy:member.id,projectId:input.projectId,name:input.name||null}).returning();await tx.insert(conversationMembers).values([member.id,...recipientIds].map(userId=>({conversationId:created[0].id,userId})));return created});
    await trackProductEvent({actorId:member.id,event:"conversation_started",entityType:"conversation",entityId:conversation.id,properties:{group:recipientIds.length>1}});return NextResponse.json(conversation,{status:201})
  }catch(error){return apiError(error)}
}

export async function PATCH(request:Request){try{
  const member=await requireMember(),input=actionSchema.parse(await request.json()),db=getDb();
  const condition=and(eq(conversationMembers.conversationId,input.conversationId),eq(conversationMembers.userId,member.id));
  const [membership]=await db.select().from(conversationMembers).where(condition).limit(1);
  if(!membership)throw new ApiError(403,"Conversation access required");
  if(input.action==="delete")await db.delete(conversationMembers).where(condition);
  else if(input.action==="archive")await db.update(conversationMembers).set({archivedAt:new Date()}).where(condition);
  else if(input.action==="restore")await db.update(conversationMembers).set({archivedAt:null,snoozedUntil:null}).where(condition);
  else if(input.action==="snooze")await db.update(conversationMembers).set({snoozedUntil:input.until?new Date(input.until):new Date(Date.now()+86400000)}).where(condition);
  else if(input.action==="rename")await db.update(conversations).set({name:input.name||null,updatedAt:new Date()}).where(eq(conversations.id,input.conversationId));
  else if(input.action==="set_image")await db.update(conversations).set({image:input.image??null,updatedAt:new Date()}).where(eq(conversations.id,input.conversationId));
  else {
    if(!input.userId)throw new ApiError(400,"Choose a member");
    const existing=await db.select({userId:conversationMembers.userId}).from(conversationMembers).where(eq(conversationMembers.conversationId,input.conversationId));
    if(existing.some(row=>row.userId===input.userId))return NextResponse.json({success:true});
    if(existing.length>=8)throw new ApiError(400,"A chat can have up to 8 members");
    const [[candidate],[sender],[chat],senderProjects,mutualRows]=await Promise.all([
      db.select({id:users.id,ageBand:users.ageBand,messagePermission:privacySettings.messagePermission,isN2Admin:sql<boolean>`case when ${adminAssignments.status} = 'active' then true else false end`}).from(users).leftJoin(privacySettings,eq(privacySettings.userId,users.id)).leftJoin(adminAssignments,eq(adminAssignments.userId,users.id)).where(and(eq(users.id,input.userId),eq(users.status,"active"))).limit(1),
      db.select({ageBand:users.ageBand,isN2Admin:sql<boolean>`case when ${adminAssignments.status} = 'active' then true else false end`}).from(users).leftJoin(adminAssignments,eq(adminAssignments.userId,users.id)).where(eq(users.id,member.id)).limit(1),
      db.select({projectId:conversations.projectId}).from(conversations).where(eq(conversations.id,input.conversationId)).limit(1),
      db.select({projectId:projectMembers.projectId}).from(projectMembers).where(eq(projectMembers.userId,member.id)),
      db.select({followerId:follows.followerId,followingId:follows.followingId}).from(follows).where(or(and(eq(follows.followerId,member.id),eq(follows.followingId,input.userId)),and(eq(follows.followerId,input.userId),eq(follows.followingId,member.id)))),
    ]);
    if(!candidate)throw new ApiError(404,"Member unavailable");
    const sharedProject=senderProjects.length?Boolean((await db.select({projectId:projectMembers.projectId}).from(projectMembers).where(and(eq(projectMembers.userId,input.userId),inArray(projectMembers.projectId,senderProjects.map(row=>row.projectId))))).length):false;
    const mutual=mutualRows.some(row=>row.followerId===member.id&&row.followingId===input.userId)&&mutualRows.some(row=>row.followerId===input.userId&&row.followingId===member.id);
    const eligibility=getMessageEligibility({permission:candidate.messagePermission,sharedProject,mutual,senderIsAdmin:Boolean(sender?.isN2Admin),recipientIsAdmin:Boolean(candidate.isN2Admin)});
    if(!eligibility.canMessage)throw new ApiError(403,eligibility.reason);
    const mixed=candidate.ageBand!==sender?.ageBand&&[candidate.ageBand,sender?.ageBand].includes("teen_16_17");
    if(mixed){if(!chat?.projectId)throw new ApiError(403,"Adult and teen contact requires a shared project");const protectedProjectMember=await db.select({userId:projectMembers.userId}).from(projectMembers).where(and(eq(projectMembers.projectId,chat.projectId),eq(projectMembers.userId,input.userId))).limit(1);if(!protectedProjectMember.length)throw new ApiError(403,"All members need the shared project");}
    await db.insert(conversationMembers).values({conversationId:input.conversationId,userId:input.userId});
  }
  return NextResponse.json({success:true});
}catch(error){return apiError(error)}}
