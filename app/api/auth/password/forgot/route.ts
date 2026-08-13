import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({ email: z.email() });

export async function POST(request: Request) {
  const generic = NextResponse.json({ message: "If that account exists, a reset link is on its way." });
  try {
    const { email: rawEmail } = schema.parse(await request.json());
    const email = rawEmail.trim().toLowerCase();
    const db = getDb();
    const [member] = await db.select({ firstName: users.firstName, name: users.name, email: users.email, passwordHash: users.passwordHash, status: users.status }).from(users).where(eq(users.email, email)).limit(1);
    if (!member?.passwordHash || !["active", "pending_onboarding", "onboarding"].includes(member.status)) return generic;
    const token = randomBytes(32).toString("base64url");
    const identifier = `reset:${email}`;
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
    await db.insert(verificationTokens).values({ identifier, token: createHash("sha256").update(token).digest("hex"), expires: new Date(Date.now() + 30 * 60 * 1000) });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const resetUrl = `${appUrl}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail({ email, firstName: member.firstName ?? member.name?.split(" ")[0] ?? "there", resetUrl });
  } catch (error) {
    console.error("Password reset request failed", error);
  }
  return generic;
}
