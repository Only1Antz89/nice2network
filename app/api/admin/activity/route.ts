import { and, count, eq, gt, isNotNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { careerHistory, conversationMembers, conversations, conversationTyping, educationHistory, meetings, messages, timelinePosts, users } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    const admin=await requirePermission("admin.view"),db=getDb(),now=new Date(),dayAgo=new Date(Date.now()-86400000),typingCutoff=new Date(Date.now()-5000);
    const [conversationCount,messageCount,messagesToday,mediaMessages,editedMessages,archivedChats,snoozedChats,typingNow,posts,mediaPosts,n2Meets,profilesWithBio,customPhotos,customBanners,completeSkills,careerProfiles,educationProfiles,groupChats,recentMeetings,recentConversations]=await Promise.all([
      db.select({value:count()}).from(conversations).where(eq(conversations.status,"active")),
      db.select({value:count()}).from(messages).where(eq(messages.status,"visible")),
      db.select({value:count()}).from(messages).where(and(eq(messages.status,"visible"),gt(messages.createdAt,dayAgo))),
      db.select({value:count()}).from(messages).where(and(eq(messages.status,"visible"),isNotNull(messages.attachmentUrl))),
      db.select({value:count()}).from(messages).where(isNotNull(messages.editedAt)),
      db.select({value:count()}).from(conversationMembers).where(isNotNull(conversationMembers.archivedAt)),
      db.select({value:count()}).from(conversationMembers).where(gt(conversationMembers.snoozedUntil,now)),
      db.select({value:count()}).from(conversationTyping).where(gt(conversationTyping.updatedAt,typingCutoff)),
      db.select({value:count()}).from(timelinePosts).where(eq(timelinePosts.status,"visible")),
      db.select({value:count()}).from(timelinePosts).where(and(eq(timelinePosts.status,"visible"),isNotNull(timelinePosts.attachmentUrl))),
      db.select({value:count()}).from(meetings).where(and(eq(meetings.provider,"n2"),gt(meetings.startsAt,now))),
      db.select({value:sql<number>`count(*)::int`}).from(users).where(sql`${users.bio} is not null and length(trim(${users.bio})) > 0`),
      db.select({value:count()}).from(users).where(isNotNull(users.image)),
      db.select({value:count()}).from(users).where(isNotNull(users.coverImage)),
      db.select({value:sql<number>`count(*)::int`}).from(users).where(sql`${users.primarySkill} is not null and ${users.secondarySkill} is not null and ${users.tertiarySkill} is not null`),
      db.select({value:sql<number>`count(distinct ${careerHistory.userId})::int`}).from(careerHistory),
      db.select({value:sql<number>`count(distinct ${educationHistory.userId})::int`}).from(educationHistory),
      db.execute(sql`select count(*)::int as value from (select conversation_id from ${conversationMembers} group by conversation_id having count(*) > 2) groups`),
      db.select({id:meetings.id,title:meetings.title,provider:meetings.provider,startsAt:meetings.startsAt,creator:users.name,attendeeCount:sql<number>`jsonb_array_length(coalesce(${meetings.attendees}, '[]'::jsonb))::int`}).from(meetings).innerJoin(users,eq(users.id,meetings.createdBy)).where(gt(meetings.startsAt,now)).orderBy(meetings.startsAt).limit(8),
      db.execute(sql`select c.id,c.name,c.updated_at,count(distinct cm.user_id)::int as member_count,count(distinct m.id)::int as message_count from ${conversations} c left join ${conversationMembers} cm on cm.conversation_id=c.id left join ${messages} m on m.conversation_id=c.id where c.status='active' group by c.id order by c.updated_at desc limit 8`),
    ]);
    await audit(admin.user.id,"admin.network_activity_viewed","analytics",undefined,{}, {permission:"admin.view"});
    return NextResponse.json({
      metrics:{activeConversations:conversationCount[0].value,groupChats:Number(groupChats[0]?.value??0),visibleMessages:messageCount[0].value,messages24h:messagesToday[0].value,mediaMessages:mediaMessages[0].value,editedMessages:editedMessages[0].value,archivedChats:archivedChats[0].value,snoozedChats:snoozedChats[0].value,typingNow:typingNow[0].value,timelinePosts:posts[0].value,mediaPosts:mediaPosts[0].value,upcomingN2Rooms:n2Meets[0].value},
      profileAdoption:{bios:profilesWithBio[0].value,customPhotos:customPhotos[0].value,customBanners:customBanners[0].value,threeSkills:completeSkills[0].value,careerHistories:careerProfiles[0].value,educationHistories:educationProfiles[0].value},
      recentMeetings,recentConversations,privacyNote:"Message bodies and attachments are excluded. Moderators can only access reported evidence through a case.",generatedAt:now,
    });
  } catch(error){return apiError(error)}
}
