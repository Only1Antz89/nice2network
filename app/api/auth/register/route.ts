import { hash } from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { privacySettings, users, verificationTokens } from "@/db/schema";
import { sendVerificationEmail } from "@/lib/email";
import { eq } from "drizzle-orm";

const schema = z.object({
  title: z.enum(["Mr", "Ms", "Mrs", "Miss", "Mx", "Dr", "Prof"]),
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  age: z.coerce.number().int().min(18).max(120),
  image: z.string().max(700_000).refine((value) => value.startsWith("data:image/"), "Choose a valid profile photo"),
  email: z.email(),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  let createdEmail: string | undefined;
  try {
    const input = schema.parse(await request.json());
    const email = input.email.toLowerCase();
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const db = getDb();
    const [member] = await db.insert(users).values({ title: input.title, firstName: input.firstName, lastName: input.lastName, age: input.age, name: `${input.firstName} ${input.lastName}`, image: input.image, email, passwordHash: await hash(input.password, 12), status: "pending_verification" }).returning({ id: users.id });
    createdEmail = email;
    await getDb().insert(privacySettings).values({ userId: member.id });
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, `verify:${email}`));
    await db.insert(verificationTokens).values({ identifier: `verify:${email}`, token: tokenHash, expires: new Date(Date.now() + 60 * 60 * 1000) });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const verificationUrl = `${appUrl}/api/auth/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    const delivery = await sendVerificationEmail({ email, firstName: input.firstName, verificationUrl });
    return NextResponse.json({ id: member.id, email, delivered: delivery.delivered, ...(process.env.NODE_ENV !== "production" ? { verificationUrl } : {}) }, { status: 201 });
  } catch (error) {
    if (createdEmail) {
      try { await getDb().delete(users).where(eq(users.email, createdEmail)); } catch { /* The original registration error remains authoritative. */ }
    }
    const message = error instanceof Error && /unique/i.test(error.message) ? "An account already exists for that email." : error instanceof Error && /email delivery/i.test(error.message) ? "The verification email could not be sent. Please try again shortly." : "Could not create your account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
