import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";
const schema=z.object({channel:z.enum(["native","whatsapp","linkedin","email","copy"])});
export async function POST(request:Request,{params}:{params:Promise<{projectId:string}>}){try{const member=await requireMember(),{projectId}=await params,{channel}=schema.parse(await request.json());await trackProductEvent({actorId:member.id,event:"project_shared",entityType:"project",entityId:projectId,properties:{source:channel}});return NextResponse.json({success:true})}catch(error){return apiError(error)}}
