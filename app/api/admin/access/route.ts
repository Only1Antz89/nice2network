import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { adminMfa, users } from "@/db/schema";
import { getAdminIdentity } from "@/lib/admin";
import { createAdminCookie, createTotpSecret, verifyAdminCookie, verifyTotp } from "@/lib/admin-mfa";
import { ApiError, apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { decrypt, encrypt } from "@/lib/integrations";
import { isSecureRequest } from "@/lib/http";

export async function GET() {
  try {
    const identity = await getAdminIdentity();
    if (!identity) throw new ApiError(403, "Administrator access required");
    const cookieStore = await cookies();
    const verified = verifyAdminCookie(cookieStore.get("n2_admin_verified")?.value ?? "", identity.user.id);
    return NextResponse.json({ forcePasswordChange: identity.forcePasswordChange, mfaEnrolled: identity.mfaEnrolled, verified });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const identity = await getAdminIdentity();
    if (!identity) throw new ApiError(403, "Administrator access required");
    if (identity.forcePasswordChange) throw new ApiError(428, "Change your temporary password first");
    const input = z.discriminatedUnion("action", [z.object({ action: z.literal("setup") }), z.object({ action: z.literal("verify"), code: z.string().regex(/^\d{6}$/) })]).parse(await request.json());
    const db = getDb();
    let [record] = await db.select().from(adminMfa).where(eq(adminMfa.userId, identity.user.id)).limit(1);
    if (input.action === "setup") {
      if (!record) {
        const secret = createTotpSecret();
        [record] = await db.insert(adminMfa).values({ userId: identity.user.id, secretEncrypted: encrypt(secret) }).returning();
      }
      if (record.enabledAt) return NextResponse.json({ enrolled: true });
      const secret = decrypt(record.secretEncrypted);
      const issuer = encodeURIComponent("nice 2 network");
      const label = encodeURIComponent(identity.user.email ?? identity.user.name ?? "n2 admin");
      return NextResponse.json({ enrolled: false, secret, otpAuthUrl: `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30` });
    }
    if (!record) throw new ApiError(400, "Start authenticator setup first");
    if (!verifyTotp(decrypt(record.secretEncrypted), input.code)) throw new ApiError(400, "That authenticator code is not valid");
    await db.update(adminMfa).set({ enabledAt: record.enabledAt ?? new Date(), lastUsedAt: new Date() }).where(eq(adminMfa.userId, identity.user.id));
    await db.update(users).set({ mfaEnrolledAt: new Date(), updatedAt: new Date() }).where(eq(users.id, identity.user.id));
    const cookieStore = await cookies();
    cookieStore.set("n2_admin_verified", createAdminCookie(identity.user.id), { httpOnly: true, sameSite: "strict", secure: isSecureRequest(request), maxAge: 12 * 60 * 60, path: "/" });
    await audit(identity.user.id, record.enabledAt ? "admin.mfa_verified" : "admin.mfa_enrolled", "user", identity.user.id, {}, { permission: "admin.view", severity: "high" });
    return NextResponse.json({ verified: true });
  } catch (error) { return apiError(error); }
}
