import { and, count, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projects, savedItems } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { requireProjectView } from "@/lib/content-access";

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params, input = z.object({ action: z.enum(["pin", "bookmark"]) }).parse(await request.json()), db = getDb();
    await requireProjectView(member.id, projectId);
    const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) throw new ApiError(404, "Project not found");
    const next=await db.transaction(async tx=>{await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${member.id}))`);const [current]=await tx.select().from(savedItems).where(and(eq(savedItems.entityType,"project"),eq(savedItems.entityId,projectId),eq(savedItems.userId,member.id))).limit(1);const value=input.action==="pin"?{pinned:!current?.pinned,bookmarked:current?.bookmarked??false}:{pinned:current?.pinned??false,bookmarked:!current?.bookmarked};if(input.action==="pin"&&value.pinned){const [pins]=await tx.select({value:count()}).from(savedItems).where(and(eq(savedItems.userId,member.id),eq(savedItems.pinned,true)));if(Number(pins?.value??0)>=3)throw new ApiError(409,"You can pin up to three items. Unpin one before adding another.")}await tx.insert(savedItems).values({entityType:"project",entityId:projectId,userId:member.id,...value}).onConflictDoUpdate({target:[savedItems.userId,savedItems.entityType,savedItems.entityId],set:{...value,updatedAt:new Date()}});return value});
    return NextResponse.json(next);
  } catch (error) { return apiError(error); }
}
