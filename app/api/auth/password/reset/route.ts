import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { sessions, users, verificationTokens } from "@/db/schema";
import { enforceRateLimit, RateLimitError, requestIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.email(), token: z.string().min(20), password: z.string().min(10).max(128) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const email = input.email.trim().toLowerCase();
    enforceRateLimit(`password-reset:${requestIp(request)}:${email}`, 8, 30 * 60_000);
    const identifier = `reset:${email}`;
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const db = getDb();
    const passwordHash = await hash(input.password, 12);
    const member = await db.transaction(async (tx) => {
      const [record] = await tx.delete(verificationTokens).where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, tokenHash), gt(verificationTokens.expires, new Date()))).returning({ identifier: verificationTokens.identifier });
      if (!record) return null;
      const [updated] = await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.email, email)).returning({ id: users.id });
      if (!updated) return null;
      await tx.delete(sessions).where(eq(sessions.userId, updated.id));
      return updated;
    });
    if (!member) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }
}
