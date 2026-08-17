import { hash } from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { privacySettings, users, verificationTokens } from "@/db/schema";
import { sendVerificationEmail } from "@/lib/email";
import { eq, like } from "drizzle-orm";
import { ageBand, ageFromDateOfBirth } from "@/lib/age";
import { trackProductEvent } from "@/lib/analytics";
import { isSecureRequest } from "@/lib/http";
import { enforceRateLimit, RateLimitError, requestIp } from "@/lib/rate-limit";
import { usernameBase } from "@/lib/usernames";

const schema = z.object({
  title: z.enum(["Mr", "Ms", "Mrs", "Miss", "Mx", "Dr", "Prof"]),
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  dateOfBirth: z.coerce.date(),
  image: z.string().max(700_000).refine((value) => !value || /^data:image\/(jpeg|png|webp);base64,/i.test(value), "Choose a valid profile photo").optional(),
  email: z.email(),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  let createdEmail: string | undefined;
  try {
    enforceRateLimit(`register:${requestIp(request)}`, 5, 60 * 60_000);
    const input = schema.parse(await request.json());
    const age = ageFromDateOfBirth(input.dateOfBirth);
    if (age < 16 || age > 120) return NextResponse.json({ error: "Members must be 16 or older." }, { status: 400 });
    const email = input.email.toLowerCase();
    const instantSignup = process.env.SIGNUP_VERIFICATION_MODE === "instant";
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const db = getDb();
    const memberAgeBand = ageBand(input.dateOfBirth);
    const base = usernameBase(email.split("@")[0] || `${input.firstName}-${input.lastName}`);
    const existingUsernames = await db.select({ username: users.username }).from(users).where(like(users.username, `${base}%`));
    const unavailable = new Set(existingUsernames.map(({ username }) => username));
    let username = base;
    for (let suffix = 2; unavailable.has(username); suffix += 1) username = `${base.slice(0, 26)}${suffix}`;
    const [member] = await db.insert(users).values({ title: input.title, firstName: input.firstName, lastName: input.lastName, age, dateOfBirth: input.dateOfBirth, ageBand: memberAgeBand, name: `${input.firstName} ${input.lastName}`, username, image: input.image || null, email, passwordHash: await hash(input.password, 12), emailVerified: instantSignup ? new Date() : null, status: instantSignup ? "pending_onboarding" : "pending_verification" }).returning({ id: users.id });
    createdEmail = email;
    await getDb().insert(privacySettings).values({ userId: member.id, ...(memberAgeBand === "teen_16_17" ? { profileVisibility: "connections", messagePermission: "connections", showLocation: false, useActivityForMatching: false } : {}) });
    await trackProductEvent({ actorId: member.id, ageBand: memberAgeBand, event: "registration_started", entityType: "user", entityId: member.id });
    if (instantSignup) {
      const onboardingToken = randomBytes(32).toString("base64url");
      await db.insert(verificationTokens).values({ identifier: `onboarding:${email}`, token: createHash("sha256").update(onboardingToken).digest("hex"), expires: new Date(Date.now() + 24 * 60 * 60 * 1000) });
      const response = NextResponse.json({ id: member.id, email, onboarding: true, verificationRequired: false }, { status: 201 });
      response.cookies.set("n2_onboarding", onboardingToken, { httpOnly: true, sameSite: "lax", secure: isSecureRequest(request), maxAge: 24 * 60 * 60, path: "/" });
      return response;
    }
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, `verify:${email}`));
    await db.insert(verificationTokens).values({ identifier: `verify:${email}`, token: tokenHash, expires: new Date(Date.now() + 60 * 60 * 1000) });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const verificationUrl = `${appUrl}/api/auth/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    const delivery = await sendVerificationEmail({ email, firstName: input.firstName, verificationUrl });
    return NextResponse.json({ id: member.id, email, delivered: delivery.delivered, verificationRequired: true, ...(process.env.NODE_ENV !== "production" ? { verificationUrl } : {}) }, { status: 201 });
  } catch (error) {
    if (createdEmail) {
      try { await getDb().delete(users).where(eq(users.email, createdEmail)); } catch { /* The original registration error remains authoritative. */ }
    }
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: error.status });
    const message = error instanceof Error && /unique/i.test(error.message) ? "An account already exists for that email." : error instanceof Error && /email delivery/i.test(error.message) ? "The verification email could not be sent. Please try again shortly." : "Could not create your account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
