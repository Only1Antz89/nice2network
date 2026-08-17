import { NextResponse } from "next/server";
import { and,desc,eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { milestones,projectMembers,projectUpdates,users } from "@/db/schema";
import { ApiError,apiError,requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireProjectView } from "@/lib/content-access";

const imageData=z.string().max(2_600_000).regex(/^data:image\/(jpeg|png|webp|gif);base64,/i);
const videoData=z.string().max(2_600_000).regex(/^data:video\/(mp4|webm|quicktime);base64,/i);
const fileData=z.string().max(2_600_000).regex(/^data:application\/(pdf|zip);base64,/i);
const attachment=z.discriminatedUnion("type",[
  z.object({type:z.literal("image"),url:imageData,name:z.string().max(160)}),
  z.object({type:z.literal("video"),url:videoData,name:z.string().max(160)}),
  z.object({type:z.literal("file"),url:fileData,name:z.string().max(160)}),
]).nullable().optional();
const inputSchema=z.object({body:z.string().trim().min(2).max(3000),type:z.enum(["update","progress","decision","risk","win"]).default("update"),milestoneId:z.uuid().nullable().optional(),attachment});
export async function GET(_:Request,{params}:{params:Promise<{projectId:string}>}){try{const member=await requireMember();const {projectId}=await params;await requireProjectView(member.id,projectId);return NextResponse.json(await getDb().select({id:projectUpdates.id,projectId:projectUpdates.projectId,milestoneId:projectUpdates.milestoneId,type:projectUpdates.type,body:projectUpdates.body,attachmentType:projectUpdates.attachmentType,attachmentUrl:projectUpdates.attachmentUrl,attachmentName:projectUpdates.attachmentName,updatedAt:projectUpdates.updatedAt,createdAt:projectUpdates.createdAt,authorId:projectUpdates.authorId,authorName:users.name,authorImage:users.image}).from(projectUpdates).innerJoin(users,eq(users.id,projectUpdates.authorId)).where(and(eq(projectUpdates.projectId,projectId),eq(projectUpdates.status,"visible"))).orderBy(desc(projectUpdates.createdAt)).limit(100))}catch(error){return apiError(error)}}
export async function POST(request:Request,{params}:{params:Promise<{projectId:string}>}){try{const member=await requireMember(),{projectId}=await params,input=inputSchema.parse(await request.json()),db=getDb();const [membership]=await db.select().from(projectMembers).where(and(eq(projectMembers.projectId,projectId),eq(projectMembers.userId,member.id))).limit(1);if(!membership)throw new ApiError(403,"Join this project before posting updates");if(input.milestoneId){const [step]=await db.select({id:milestones.id}).from(milestones).where(and(eq(milestones.id,input.milestoneId),eq(milestones.projectId,projectId))).limit(1);if(!step)throw new ApiError(400,"Choose a roadmap step from this project")}const [update]=await db.insert(projectUpdates).values({projectId,authorId:member.id,milestoneId:input.milestoneId,type:input.type,body:input.body,attachmentType:input.attachment?.type,attachmentUrl:input.attachment?.url,attachmentName:input.attachment?.name}).returning();await audit(member.id,"project.update_posted","project",projectId,{updateId:update.id,milestoneId:input.milestoneId});return NextResponse.json({...update,authorName:member.name,authorImage:member.image},{status:201})}catch(error){return apiError(error)}}
