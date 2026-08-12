import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { auditLog, users } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
export async function GET(){try{const admin=await requirePermission("audit.view");const rows=await getDb().select({id:auditLog.id,action:auditLog.action,targetType:auditLog.targetType,targetId:auditLog.targetId,permission:auditLog.permission,reason:auditLog.reason,severity:auditLog.severity,requestId:auditLog.requestId,actorName:users.name,createdAt:auditLog.createdAt}).from(auditLog).leftJoin(users,eq(users.id,auditLog.actorId)).orderBy(desc(auditLog.createdAt)).limit(200);await audit(admin.user.id,"admin.audit_viewed","audit",undefined,{count:rows.length},{permission:"audit.view",severity:"high"});return NextResponse.json({audit:rows})}catch(error){return apiError(error)}}
