import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { applications, projectRoles, projects } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { trackProductEvent } from "@/lib/analytics";
const schema=z.object({roleId:z.uuid(),message:z.string().trim().max(1200).optional()});
export async function POST(request:Request,{params}:{params:Promise<{projectId:string}>}){try{const member=await requireMember(),{projectId}=await params,input=schema.parse(await request.json()),db=getDb();const [role]=await db.select({role:projectRoles,ownerId:projects.ownerId,projectTitle:projects.title}).from(projectRoles).innerJoin(projects,eq(projects.id,projectRoles.projectId)).where(eq(projectRoles.id,input.roleId)).limit(1);if(!role||role.role.projectId!==projectId||role.role.status!=="open")throw new ApiError(404,"This role is no longer open");const [application]=await db.insert(applications).values({projectId,roleId:input.roleId,applicantId:member.id,message:input.message}).returning();await createNotification({userId:role.ownerId,actorId:member.id,type:"application",title:`New application from ${member.name??"an n2 member"}`,body:`${role.role.title} · ${role.projectTitle}`,entityType:"application",entityId:application.id,href:`/?view=projects&project=${projectId}`});await audit(member.id,"project.applied","project",projectId,{applicationId:application.id,roleId:input.roleId});await trackProductEvent({actorId:member.id,event:"project_application",entityType:"project",entityId:projectId});return NextResponse.json(application,{status:201})}catch(error){return apiError(error)}}
