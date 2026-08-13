import { desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { recommendationJobs } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getActiveAlgorithmSettings } from "@/lib/recommendations/service";
export async function GET(){try{const admin=await requirePermission("system.view");const db=getDb();await db.execute(sql`select 1`);const algorithm=await getActiveAlgorithmSettings();const jobs=await db.select().from(recommendationJobs).orderBy(desc(recommendationJobs.createdAt)).limit(5);await audit(admin.user.id,"admin.system_health_viewed","system",undefined,{}, {permission:"system.view"});return NextResponse.json({database:"healthy",email:process.env.RESEND_API_KEY&&process.env.EMAIL_FROM?"configured":"not_configured",google:process.env.GOOGLE_CLIENT_ID?"configured":"not_configured",microsoft:process.env.MICROSOFT_CLIENT_ID?"configured":"not_configured",backgroundJobs:process.env.CRON_SECRET?"configured":"not_configured",aiProvider:algorithm.provider,blueprintModel:algorithm.blueprintModel,embeddingModel:algorithm.embeddingModel,providerCredentials:algorithm.provider==="openai"?(process.env.OPENAI_API_KEY?"configured":"not_configured"):(process.env.GEMINI_API_KEY?"configured":"not_configured"),rolloutStage:algorithm.rolloutStage,algorithmVersion:algorithm.version,reindexStatus:jobs[0]?.status??"idle",recommendationJobs:jobs,generatedAt:new Date()})}catch(error){return apiError(error)}}
