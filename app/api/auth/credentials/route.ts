import { NextResponse } from "next/server";
import { z } from "zod";
import { signIn } from "@/auth";

const schema = z.object({
  email: z.email().transform(value => value.trim().toLowerCase()),
  password: z.string().min(10).max(200),
});

export async function POST(request: Request) {
  try {
    const input = schema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });

    const destination = await signIn("credentials", {
      email: input.data.email,
      password: input.data.password,
      redirect: false,
      redirectTo: "/",
    });
    const result = new URL(destination, new URL(request.url).origin);
    const code = result.searchParams.get("code");
    if (code === "rate_limit") return NextResponse.json({ error: "Too many sign-in attempts. Please wait 15 minutes and try again." }, { status: 429 });
    if (result.searchParams.has("error")) return NextResponse.json({ error: "Check your email and password. If registration is unfinished, use the password you created to resume your profile setup." }, { status: 401 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Credential sign-in failed after validation", error);
    return NextResponse.json({ error: "Sign in is temporarily unavailable. Please refresh the page and try again." }, { status: 503 });
  }
}
