import { compare, hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { apiError, ApiError, requireMember } from "@/lib/api";

const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(10).max(128) });

export async function POST(request: Request) {
  try {
    const member = await requireMember();
    const input = schema.parse(await request.json());
    const [record] = await getDb().select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, member.id)).limit(1);
    if (!record?.passwordHash) throw new ApiError(400, "Password sign-in is not enabled for this account.");
    if (!(await compare(input.currentPassword, record.passwordHash))) throw new ApiError(400, "Your current password is incorrect.");
    if (await compare(input.newPassword, record.passwordHash)) throw new ApiError(400, "Choose a password you have not just used.");
    await getDb().update(users).set({ passwordHash: await hash(input.newPassword, 12), updatedAt: new Date() }).where(eq(users.id, member.id));
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
