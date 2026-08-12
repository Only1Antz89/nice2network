import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { sessions, users, verificationTokens } from "@/db/schema";

const schema = z.object({ email: z.email(), token: z.string().min(20), password: z.string().min(10).max(128) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const email = input.email.trim().toLowerCase();
    const identifier = `reset:${email}`;
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const db = getDb();
    const [record] = await db.select().from(verificationTokens).where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, tokenHash), gt(verificationTokens.expires, new Date()))).limit(1);
    if (!record) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    const [member] = await db.update(users).set({ passwordHash: await hash(input.password, 12), updatedAt: new Date() }).where(eq(users.email, email)).returning({ id: users.id });
    if (!member) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
    await db.delete(sessions).where(eq(sessions.userId, member.id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }
}
