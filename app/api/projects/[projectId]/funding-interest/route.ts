import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projectFundingInterests, projectMembers, projects, users } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";
import { createNotification } from "@/lib/notifications";
import { requireProjectView } from "@/lib/content-access";

const inputSchema=z.object({type:z.enum(["invest","donate","contribute","share_request"]),amount:z.number().positive().max(1_000_000).optional(),message:z.string().trim().max(600).optional()});

export async function POST(request:Request,{params}:{params:Promise<{projectId:string}>}){
  try{
    const member=await requireMember(),{projectId}=await params,input=inputSchema.parse(await request.json()),db=getDb();
    await requireProjectView(member.id,projectId);
    const [project]=await db.select({ownerId:projects.ownerId,title:projects.title,status:projects.status,visibility:projects.visibility,openToInvestment:projects.openToInvestment,openToContributions:projects.openToContributions}).from(projects).where(eq(projects.id,projectId)).limit(1);
    const [membership]=await db.select({role:projectMembers.membershipRole}).from(projectMembers).where(and(eq(projectMembers.projectId,projectId),eq(projectMembers.userId,member.id))).limit(1);
    if(!project||project.status!=="active"||(project.visibility==="private"&&!membership))throw new ApiError(404,"Project is not open for public contribution interest");
    if(project.ownerId===member.id)throw new ApiError(400,"Project owners cannot register interest in their own project");
    if(["invest","share_request"].includes(input.type)&&!project.openToInvestment)throw new ApiError(409,"This project is not currently open to investment discussions");
    if(["contribute","donate"].includes(input.type)&&!project.openToContributions)throw new ApiError(409,"This project is not currently open to financial contributions");
    const [identity]=await db.select({verified:users.emailVerified,status:users.status}).from(users).where(and(eq(users.id,member.id),eq(users.status,"active"))).limit(1);
    if(!identity?.verified)throw new ApiError(403,"Verify your account before registering financial interest");
    const label=input.type==="share_request"?"requested an ownership discussion":input.type==="invest"?"registered investment interest":input.type==="donate"?"offered a donation":"offered a financial contribution";
    const amount=input.amount?` · £${input.amount.toLocaleString("en-GB")}`:"";
    const [interest]=await db.insert(projectFundingInterests).values({projectId,userId:member.id,type:input.type,amount:input.amount??null,message:input.message||null}).returning();
    await createNotification({userId:project.ownerId,actorId:member.id,type:"project",title:`A verified member ${label}`,body:`${project.title}${amount}${input.message?` · ${input.message}`:""}`,entityType:"project",entityId:projectId,href:`/?project=${projectId}`});
    await trackProductEvent({actorId:member.id,event:"project_funding_interest",entityType:"project",entityId:projectId,properties:{type:input.type,amount:input.amount??null}});
    return NextResponse.json({success:true,message:"Your interest was sent to the project owner. No payment or ownership transfer has occurred.",interest:{...interest,userName:member.name,userImage:member.image}});
  }catch(error){return apiError(error)}
}
