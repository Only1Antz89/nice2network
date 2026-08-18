import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { appeals, sanctions, users } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { accountRestrictionTypes } from "@/lib/admin-sanctions";
import { ApiError, apiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    const admin = await requirePermission("appeals.manage");
    const rows = await getDb().select({ id: appeals.id, status: appeals.status, statement: appeals.statement, resolution: appeals.resolution, appellantName: users.name, createdAt: appeals.createdAt })
      .from(appeals).innerJoin(users, eq(users.id, appeals.appellantId)).orderBy(desc(appeals.createdAt)).limit(100);
    await audit(admin.user.id, "admin.appeals_viewed", "appeals", undefined, { count: rows.length }, { permission: "appeals.manage" });
    return NextResponse.json({ appeals: rows });
  } catch (error) { return apiError(error); }
}

const decisionSchema = z.object({ appealId: z.uuid(), decision: z.enum(["upheld", "overturned"]), reason: z.string().trim().min(10).max(2000) });

export async function POST(request: Request) {
  try {
    const admin = await requirePermission("appeals.manage");
    const input = decisionSchema.parse(await request.json());
    const before = await getDb().transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`appeal:${input.appealId}`}))`);
      const [appeal] = await tx.select().from(appeals).where(eq(appeals.id, input.appealId)).limit(1);
      if (!appeal) throw new ApiError(404, "Appeal not found");
      if (appeal.status !== "open") throw new ApiError(409, "This appeal has already been decided");

      if (appeal.sanctionId) {
        const [sanction] = await tx.select().from(sanctions).where(eq(sanctions.id, appeal.sanctionId)).limit(1);
        if (sanction?.issuedBy === admin.user.id) throw new ApiError(409, "Appeals require an independent administrator");
        if (input.decision === "overturned" && sanction) {
          await tx.update(sanctions).set({ status: "revoked", revokedBy: admin.user.id, revokedAt: new Date() }).where(and(eq(sanctions.id, sanction.id), eq(sanctions.status, "active")));
          const [remaining] = await tx.select({ id: sanctions.id }).from(sanctions).where(and(eq(sanctions.userId, sanction.userId), eq(sanctions.status, "active"), inArray(sanctions.type, accountRestrictionTypes), or(isNull(sanctions.expiresAt), gt(sanctions.expiresAt, new Date())))).limit(1);
          if (!remaining) await tx.update(users).set({ status: "active", sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() }).where(eq(users.id, sanction.userId));
        }
      }

      await tx.update(appeals).set({ status: input.decision, reviewedBy: admin.user.id, resolution: input.reason, resolvedAt: new Date() }).where(and(eq(appeals.id, input.appealId), eq(appeals.status, "open")));
      return appeal;
    });
    await audit(admin.user.id, `admin.appeal_${input.decision}`, "appeal", input.appealId, {}, { permission: "appeals.manage", reason: input.reason, severity: "high", before: { status: before.status }, after: { status: input.decision } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
