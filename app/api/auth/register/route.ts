import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { privacySettings, users } from "@/db/schema";

const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.email(), password: z.string().min(10).max(128) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const [member] = await getDb().insert(users).values({ name: input.name, email: input.email.toLowerCase(), passwordHash: await hash(input.password, 12) }).returning({ id: users.id });
    await getDb().insert(privacySettings).values({ userId: member.id });
    return NextResponse.json({ id: member.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && /unique/i.test(error.message) ? "An account already exists for that email." : "Could not create your account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
