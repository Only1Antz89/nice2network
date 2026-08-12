import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { scoreMatch } from "@/lib/matching";

const schema=z.object({memberSkills:z.array(z.string()),memberInterests:z.array(z.string()),memberIndustry:z.string().nullable().optional(),projectSkills:z.array(z.string()),projectIndustry:z.string(),projectTags:z.array(z.string()),distanceKm:z.number().min(0).optional(),feedbackAffinity:z.number().min(-1).max(1).optional()});
export async function POST(request:Request){try{const member=await requireMember(),input=schema.parse(await request.json());const [record]=await getDb().select({ageBand:users.ageBand}).from(users).where(eq(users.id,member.id)).limit(1);return NextResponse.json(scoreMatch(record?.ageBand==="teen_16_17"?{...input,distanceKm:undefined,feedbackAffinity:undefined}:input))}catch(error){return apiError(error)}}
