import { asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { safetyRisks, users } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
export async function GET(){try{const admin=await requirePermission("safety.manage");const rows=await getDb().select({id:safetyRisks.id,type:safetyRisks.type,severity:safetyRisks.severity,status:safetyRisks.status,details:safetyRisks.details,memberName:users.name,ageBand:users.ageBand,createdAt:safetyRisks.createdAt}).from(safetyRisks).leftJoin(users,eq(users.id,safetyRisks.subjectUserId)).orderBy(asc(safetyRisks.severity),desc(safetyRisks.createdAt)).limit(100);await audit(admin.user.id,"admin.safety_queue_viewed","safety_risk",undefined,{count:rows.length},{permission:"safety.manage",severity:"high"});return NextResponse.json({risks:rows})}catch(error){return apiError(error)}}
