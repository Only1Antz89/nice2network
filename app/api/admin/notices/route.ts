import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { officialNotices, users } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
const schema=z.object({title:z.string().trim().min(4).max(120),body:z.string().trim().min(10).max(3000),audience:z.enum(["all","adults","teens"]).default("all"),expiresAt:z.iso.datetime().optional()});
export async function GET(){try{const admin=await requirePermission("notices.manage");const rows=await getDb().select({id:officialNotices.id,title:officialNotices.title,body:officialNotices.body,status:officialNotices.status,audience:officialNotices.audience,publishedAt:officialNotices.publishedAt,authorName:users.name}).from(officialNotices).innerJoin(users,eq(users.id,officialNotices.authorId)).orderBy(desc(officialNotices.publishedAt)).limit(50);await audit(admin.user.id,"admin.notices_viewed","notice",undefined,{count:rows.length},{permission:"notices.manage"});return NextResponse.json({notices:rows})}catch(error){return apiError(error)}}
export async function POST(request:Request){try{const admin=await requirePermission("notices.manage");const input=schema.parse(await request.json());const [notice]=await getDb().insert(officialNotices).values({...input,authorId:admin.user.id,expiresAt:input.expiresAt?new Date(input.expiresAt):null}).returning();await audit(admin.user.id,"admin.official_notice_published","notice",notice.id,{audience:input.audience},{permission:"notices.manage",reason:input.title,severity:"info"});return NextResponse.json(notice,{status:201})}catch(error){return apiError(error)}}
