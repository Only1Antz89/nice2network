import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { officialNotices } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { ApiError, apiError } from "@/lib/api";
import { audit } from "@/lib/audit";

const updateSchema = z.object({
  title: z.string().trim().min(4).max(120),
  body: z.string().trim().min(10).max(3000),
  audience: z.enum(["all", "adults", "teens"]),
  expiresAt: z.union([z.iso.datetime(), z.null()]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ noticeId: string }> },
) {
  try {
    const admin = await requirePermission("notices.manage");
    const { noticeId } = await params;
    const input = updateSchema.parse(await request.json());
    const db = getDb();
    const [before] = await db.select().from(officialNotices).where(eq(officialNotices.id, noticeId)).limit(1);
    if (!before || before.status === "deleted") throw new ApiError(404, "Notice not found");
    const [notice] = await db.update(officialNotices).set({
      title: input.title,
      body: input.body,
      audience: input.audience,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    }).where(eq(officialNotices.id, noticeId)).returning();
    await audit(admin.user.id, "admin.official_notice_updated", "notice", noticeId, undefined, {
      before,
      after: notice,
      permission: "notices.manage",
      reason: input.title,
      severity: "info",
    });
    return NextResponse.json(notice);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ noticeId: string }> },
) {
  try {
    const admin = await requirePermission("notices.manage");
    const { noticeId } = await params;
    const db = getDb();
    const [before] = await db.select().from(officialNotices).where(eq(officialNotices.id, noticeId)).limit(1);
    if (!before || before.status === "deleted") throw new ApiError(404, "Notice not found");
    const [notice] = await db.update(officialNotices).set({ status: "deleted" }).where(eq(officialNotices.id, noticeId)).returning();
    await audit(admin.user.id, "admin.official_notice_deleted", "notice", noticeId, undefined, {
      before,
      after: notice,
      permission: "notices.manage",
      reason: before.title,
      severity: "warning",
    });
    return NextResponse.json({ deleted: true, id: noticeId });
  } catch (error) {
    return apiError(error);
  }
}
