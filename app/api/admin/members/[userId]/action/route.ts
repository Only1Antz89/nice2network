import { createHash, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { adminAssignments, sanctions, sessions, users, verificationTokens } from "@/db/schema";
import { canManageAdminRole, requirePermission } from "@/lib/admin";
import type { AdminPermission } from "@/lib/admin";
import { accountRestrictionTypes, sanctionTypes } from "@/lib/admin-sanctions";
import { ApiError, apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";

const schema = z.object({ action: z.enum(["resend_verification", "trigger_recovery", "set_temporary_password", "warn", "restrict_messaging", "restrict_invitations", "restrict_meetings", "suspend", "ban", "reactivate", "expire_sessions"]), reason: z.string().trim().min(10).max(1000), policyCode: z.string().trim().min(2).max(80).default("community_standards"), expiresAt: z.iso.datetime().optional(), temporaryPassword: z.string().min(12).max(128).optional() });

const permissionByAction: Record<z.infer<typeof schema>["action"], AdminPermission> = {
  resend_verification: "members.support",
  trigger_recovery: "members.support",
  set_temporary_password: "members.credentials.reset",
  expire_sessions: "members.sessions.expire",
  warn: "sanctions.warn",
  restrict_messaging: "sanctions.restrict",
  restrict_invitations: "sanctions.restrict",
  restrict_meetings: "sanctions.restrict",
  suspend: "sanctions.suspend",
  reactivate: "sanctions.suspend",
  ban: "sanctions.ban",
};

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const input = schema.parse(await request.json());
    const admin = await requirePermission(permissionByAction[input.action]);
    const db = getDb();
    const [target] = await db.select({ status: users.status, email: users.email, firstName: users.firstName, name: users.name, emailVerified: users.emailVerified }).from(users).where(eq(users.id, userId)).limit(1);
    if (!target) throw new ApiError(404, "Member not found");
    if (input.action === "reactivate" && target.status === "banned") await requirePermission("sanctions.ban");
    const [targetAssignment] = await db.select().from(adminAssignments).where(and(eq(adminAssignments.userId, userId), eq(adminAssignments.status, "active"))).limit(1);
    if (userId === admin.user.id) throw new ApiError(403, "Administrators cannot apply member actions to their own account");
    if (targetAssignment && !canManageAdminRole(admin.role, targetAssignment.role)) throw new ApiError(403, "Only the Master Admin can manage this administrator's account");
    if (["suspend", "ban"].includes(input.action)) {
      if (targetAssignment?.role === "master_admin") {
        const [active] = await db.select({ value: count() }).from(adminAssignments).where(and(eq(adminAssignments.role, "master_admin"), eq(adminAssignments.status, "active")));
        if (active.value <= 1) throw new ApiError(409, "The final Master Admin cannot be suspended or banned");
      }
      if (targetAssignment?.role === "super_admin") {
        const [active] = await db.select({ value: count() }).from(adminAssignments).where(and(eq(adminAssignments.role, "super_admin"), eq(adminAssignments.status, "active")));
        if (active.value <= 1) throw new ApiError(409, "The final super administrator cannot be suspended or banned. Activate another super administrator first");
      }
    }
    if (input.action === "resend_verification") {
      if (target.emailVerified) throw new ApiError(409, "This email is already verified. Use password recovery for sign-in problems");
      const token = randomBytes(32).toString("base64url"), identifier = `verify:${target.email}`;
      await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
      await db.insert(verificationTokens).values({ identifier, token: createHash("sha256").update(token).digest("hex"), expires: new Date(Date.now() + 60 * 60 * 1000) });
      await sendVerificationEmail({ email: target.email, firstName: target.firstName ?? target.name?.split(" ")[0] ?? "there", verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?email=${encodeURIComponent(target.email)}&token=${encodeURIComponent(token)}` });
    } else if (input.action === "trigger_recovery") {
      const token = randomBytes(32).toString("base64url"), identifier = `reset:${target.email}`;
      await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
      await db.insert(verificationTokens).values({ identifier, token: createHash("sha256").update(token).digest("hex"), expires: new Date(Date.now() + 30 * 60 * 1000) });
      try {
        await sendPasswordResetEmail({ email: target.email, firstName: target.firstName ?? target.name?.split(" ")[0] ?? "there", resetUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?email=${encodeURIComponent(target.email)}&token=${encodeURIComponent(token)}` });
      } catch {
        await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
        throw new ApiError(503, "Password recovery email is not configured. Use Set temporary password, or configure production email delivery first");
      }
    } else if (input.action === "set_temporary_password") {
      if (!input.temporaryPassword) throw new ApiError(400, "Enter a temporary password of at least 12 characters");
      await db.update(users).set({ passwordHash: await hash(input.temporaryPassword, 12), sessionVersion: sql`${users.sessionVersion} + 1`, forcePasswordChange: true, updatedAt: new Date() }).where(eq(users.id, userId));
      await db.delete(sessions).where(eq(sessions.userId, userId));
      await db.delete(verificationTokens).where(eq(verificationTokens.identifier, `reset:${target.email}`));
    } else if (input.action === "expire_sessions") {
      await db.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() }).where(eq(users.id, userId));
      await db.delete(sessions).where(eq(sessions.userId, userId));
    }
    else if (input.action === "reactivate") {
      await db.transaction(async tx => {
        await tx.update(sanctions).set({ status: "revoked", revokedBy: admin.user.id, revokedAt: new Date() }).where(and(eq(sanctions.userId, userId), eq(sanctions.status, "active"), inArray(sanctions.type, accountRestrictionTypes)));
        await tx.update(users).set({ status: "active", sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() }).where(eq(users.id, userId));
      });
    } else {
      const status = input.action === "ban" ? "banned" : input.action === "suspend" ? "suspended" : target.status;
      const sanctionStatus = input.action === "warn" ? "recorded" : "active";
      await db.insert(sanctions).values({ userId, type: sanctionTypes[input.action as keyof typeof sanctionTypes], status: sanctionStatus, reason: input.reason, policyCode: input.policyCode, issuedBy: admin.user.id, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null });
      if (status !== target.status) await db.update(users).set({ status, sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() }).where(eq(users.id, userId));
      if (["suspend", "ban"].includes(input.action)) {
        await db.delete(sessions).where(eq(sessions.userId, userId));
        await db.update(adminAssignments).set({ status: "suspended", updatedAt: new Date() }).where(eq(adminAssignments.userId, userId));
      }
    }
    await audit(admin.user.id, `admin.member_${input.action}`, "user", userId, { policyCode: input.policyCode }, { permission: permissionByAction[input.action], reason: input.reason, severity: ["ban", "suspend"].includes(input.action) ? "high" : "warning", before: target, after: { action: input.action } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
