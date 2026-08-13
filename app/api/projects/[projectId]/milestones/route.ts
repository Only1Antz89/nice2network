import { NextResponse } from "next/server";
import { and,eq,max } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { milestones,projectMembers,projects,projectUpdates } from "@/db/schema";
import { ApiError,apiError,requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema=z.object({title:z.string().trim().min(3).max(120),description:z.string().trim().max(800).optional(),phase:z.enum(["now","next","later"]).default("now"),ownerId:z.uuid().nullable().optional(),dueAt:z.iso.datetime().nullable().optional()});
async function requireOwner(userId:string,projectId:string){const [row]=await getDb().select({ownerId:projects.ownerId,membershipRole:projectMembers.membershipRole}).from(projects).leftJoin(projectMembers,and(eq(projectMembers.projectId,projectId),eq(projectMembers.userId,userId))).where(eq(projects.id,projectId)).limit(1);if(!row||(row.ownerId!==userId&&row.membershipRole!=="co_owner"))throw new ApiError(403,"Only project owners can edit the roadmap");}
export async function POST(request:Request,{params}:{params:Promise<{projectId:string}>}){try{const member=await requireMember(),{projectId}=await params,input=schema.parse(await request.json()),db=getDb();await requireOwner(member.id,projectId);const [position]=await db.select({value:max(milestones.sortOrder)}).from(milestones).where(eq(milestones.projectId,projectId));const [milestone]=await db.insert(milestones).values({...input,dueAt:input.dueAt?new Date(input.dueAt):null,projectId,sortOrder:(position.value??-1)+1}).returning();await db.insert(projectUpdates).values({projectId,milestoneId:milestone.id,authorId:member.id,type:"milestone_created",body:`Added roadmap step: ${input.title}`});await audit(member.id,"milestone.created","project",projectId,{milestoneId:milestone.id});return NextResponse.json(milestone,{status:201})}catch(error){return apiError(error)}}
