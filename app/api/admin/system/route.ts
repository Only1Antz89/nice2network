import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { requirePermission } from "@/lib/admin";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
export async function GET(){try{const admin=await requirePermission("system.view");await getDb().execute(sql`select 1`);await audit(admin.user.id,"admin.system_health_viewed","system",undefined,{}, {permission:"system.view"});return NextResponse.json({database:"healthy",email:process.env.RESEND_API_KEY&&process.env.EMAIL_FROM?"configured":"not_configured",google:process.env.GOOGLE_CLIENT_ID?"configured":"not_configured",microsoft:process.env.MICROSOFT_CLIENT_ID?"configured":"not_configured",backgroundJobs:process.env.CRON_SECRET?"configured":"not_configured",generatedAt:new Date()})}catch(error){return apiError(error)}}
