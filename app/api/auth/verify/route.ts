import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { trackProductEvent } from "@/lib/analytics";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();
  const token = url.searchParams.get("token");
  if (!email || !token) return NextResponse.redirect(new URL("/signin?verification=invalid", url.origin));

  const db = getDb();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const identifier = `verify:${email}`;
  const [record] = await db.select().from(verificationTokens).where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, tokenHash), gt(verificationTokens.expires, new Date()))).limit(1);
  if (!record) return NextResponse.redirect(new URL("/signin?verification=expired", url.origin));

  const [member] = await db.update(users).set({ emailVerified: new Date(), status: "onboarding", updatedAt: new Date() }).where(eq(users.email, email)).returning({ id: users.id, ageBand: users.ageBand });
  if (member) await trackProductEvent({ actorId: member.id, ageBand: member.ageBand, event: "email_verified", entityType: "user", entityId: member.id });
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));

  const onboardingToken = randomBytes(32).toString("base64url");
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, `onboarding:${email}`));
  await db.insert(verificationTokens).values({ identifier: `onboarding:${email}`, token: createHash("sha256").update(onboardingToken).digest("hex"), expires: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  const response = NextResponse.redirect(new URL("/onboarding?verified=1", url.origin));
  response.cookies.set("n2_onboarding", onboardingToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60, path: "/" });
  return response;
}
