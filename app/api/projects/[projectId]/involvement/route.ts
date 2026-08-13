import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projectInvolvementRequests, projectMembers, projects } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { createNotification } from "@/lib/notifications";

const schema=z.object({message:z.string().trim().min(10).max(1000),services:z.array(z.string().trim().min(1).max(80)).max(8).default([])});
export async function POST(request:Request,{params}:{params:Promise<{projectId:string}>}){
  try{const member=await requireMember(),{projectId}=await params,input=schema.parse(await request.json()),db=getDb();const [project]=await db.select({ownerId:projects.ownerId,title:projects.title,status:projects.status,visibility:projects.visibility}).from(projects).where(eq(projects.id,projectId)).limit(1);if(!project||project.status!=="active"||project.visibility==="private")throw new ApiError(404,"Project not available");if(project.ownerId===member.id)throw new ApiError(400,"You already own this project");const [membership]=await db.select({id:projectMembers.userId}).from(projectMembers).where(and(eq(projectMembers.projectId,projectId),eq(projectMembers.userId,member.id))).limit(1);if(membership)throw new ApiError(400,"You are already part of this project");await db.insert(projectInvolvementRequests).values({projectId,userId:member.id,message:input.message,services:input.services}).onConflictDoUpdate({target:[projectInvolvementRequests.projectId,projectInvolvementRequests.userId],set:{message:input.message,services:input.services,status:"pending",updatedAt:new Date()}});await createNotification({userId:project.ownerId,actorId:member.id,type:"project",title:"New offer to get involved",body:`${project.title} · ${input.message}`,entityType:"project",entityId:projectId,href:`/?project=${projectId}`});return NextResponse.json({status:"pending",message:"Your offer was sent to the project owner."})}catch(error){return apiError(error)}
}
