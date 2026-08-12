import { createHash, randomBytes } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { adminAssignments, sanctions, sessions, users, verificationTokens } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { ApiError, apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";

const schema = z.object({ action: z.enum(["resend_verification", "trigger_recovery", "warn", "restrict_messaging", "restrict_invitations", "restrict_meetings", "suspend", "ban", "reactivate", "expire_sessions"]), reason: z.string().trim().min(10).max(1000), policyCode: z.string().trim().min(2).max(80).default("community_standards"), expiresAt: z.iso.datetime().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requirePermission("members.manage");
    const { userId } = await params;
    const input = schema.parse(await request.json());
    const db = getDb();
    const [target] = await db.select({ status: users.status, email: users.email, firstName: users.firstName, name: users.name, emailVerified: users.emailVerified }).from(users).where(eq(users.id, userId)).limit(1);
    if (!target) throw new ApiError(404, "Member not found");
    if (["suspend", "ban"].includes(input.action)) {
      const [assignment] = await db.select().from(adminAssignments).where(and(eq(adminAssignments.userId, userId), eq(adminAssignments.status, "active"))).limit(1);
      if (assignment?.role === "super_admin") {
        const [active] = await db.select({ value: count() }).from(adminAssignments).where(and(eq(adminAssignments.role, "super_admin"), eq(adminAssignments.status, "active")));
        if (active.value <= 1) throw new ApiError(409, "The final super administrator cannot be suspended or banned");
      }
    }
    if (input.action === "resend_verification") {
      if (target.emailVerified) throw new ApiError(409, "This email is already verified");
      const token = randomBytes(32).toString("base64url"), identifier = `verify:${target.email}`;
      await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
      await db.insert(verificationTokens).values({ identifier, token: createHash("sha256").update(token).digest("hex"), expires: new Date(Date.now() + 60 * 60 * 1000) });
      await sendVerificationEmail({ email: target.email, firstName: target.firstName ?? target.name?.split(" ")[0] ?? "there", verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?email=${encodeURIComponent(target.email)}&token=${encodeURIComponent(token)}` });
    } else if (input.action === "trigger_recovery") {
      const token = randomBytes(32).toString("base64url"), identifier = `password-reset:${target.email}`;
      await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
      await db.insert(verificationTokens).values({ identifier, token: createHash("sha256").update(token).digest("hex"), expires: new Date(Date.now() + 30 * 60 * 1000) });
      await sendPasswordResetEmail({ email: target.email, firstName: target.firstName ?? target.name?.split(" ")[0] ?? "there", resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?email=${encodeURIComponent(target.email)}&token=${encodeURIComponent(token)}` });
    } else if (input.action === "expire_sessions") await db.delete(sessions).where(eq(sessions.userId, userId));
    else if (input.action === "reactivate") {
      await db.update(users).set({ status: "active", updatedAt: new Date() }).where(eq(users.id, userId));
      await db.update(sanctions).set({ status: "revoked", revokedBy: admin.user.id, revokedAt: new Date() }).where(eq(sanctions.userId, userId));
    } else {
      const status = input.action === "ban" ? "banned" : input.action === "suspend" ? "suspended" : target.status;
      await db.insert(sanctions).values({ userId, type: input.action, reason: input.reason, policyCode: input.policyCode, issuedBy: admin.user.id, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null });
      if (status !== target.status) await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, userId));
      if (["suspend", "ban"].includes(input.action)) {
        await db.delete(sessions).where(eq(sessions.userId, userId));
        await db.update(adminAssignments).set({ status: "suspended", updatedAt: new Date() }).where(eq(adminAssignments.userId, userId));
      }
    }
    await audit(admin.user.id, `admin.member_${input.action}`, "user", userId, { policyCode: input.policyCode }, { permission: "members.manage", reason: input.reason, severity: ["ban", "suspend"].includes(input.action) ? "high" : "warning", before: target, after: { action: input.action } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
