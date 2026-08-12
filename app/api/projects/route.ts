import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projects, projectMembers, projectRoles } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";

const inputSchema=z.object({title:z.string().trim().min(4).max(120),summary:z.string().trim().min(20).max(300),description:z.string().max(5000).optional(),industry:z.string().min(2).max(80),stage:z.enum(["idea","planning","building","launching"]).default("idea"),visibility:z.enum(["network","connections","private"]).default("network"),roles:z.array(z.object({title:z.string().min(2).max(80),department:z.string().min(2).max(80),description:z.string().max(500).optional(),skills:z.array(z.string().max(50)).max(12).default([])})).max(12).default([])});
export async function POST(request:Request){try{const member=await requireMember();const input=inputSchema.parse(await request.json());const [project]=await getDb().insert(projects).values({...input,ownerId:member.id}).returning();await getDb().insert(projectMembers).values({projectId:project.id,userId:member.id,membershipRole:"owner",department:"Leadership"});if(input.roles.length)await getDb().insert(projectRoles).values(input.roles.map(role=>({...role,projectId:project.id})));await audit(member.id,"project.created","project",project.id,{roleCount:input.roles.length});return NextResponse.json(project,{status:201})}catch(error){return apiError(error)}}
