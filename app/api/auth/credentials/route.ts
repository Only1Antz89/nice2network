import { NextResponse } from "next/server";
import { Auth, raw, skipCSRFCheck } from "@auth/core";
import { z } from "zod";
import { authConfig } from "@/auth";

const schema = z.object({
  email: z.email().transform(value => value.trim().toLowerCase()),
  password: z.string().min(10).max(200),
});

export async function POST(request: Request) {
  try {
    const input = schema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });

    const origin = new URL(request.url).origin;
    const authRequest = new Request(`${origin}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email: input.data.email,
        password: input.data.password,
        callbackUrl: `${origin}/`,
      }),
    });
    const authResult = await Auth(authRequest, { ...authConfig, raw, skipCSRFCheck });
    const result = new URL(authResult.redirect ?? `${origin}/`, origin);
    const code = result.searchParams.get("code");
    if (code === "rate_limit") return NextResponse.json({ error: "Too many sign-in attempts. Please wait 15 minutes and try again." }, { status: 429 });
    if (result.searchParams.has("error")) return NextResponse.json({ error: "Check your email and password. If registration is unfinished, use the password you created to resume your profile setup." }, { status: 401 });

    const response = NextResponse.json({ ok: true });
    for (const cookie of authResult.cookies ?? []) response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    console.error("Credential sign-in failed after validation", error);
    return NextResponse.json({ error: "Sign in is temporarily unavailable. Please refresh the page and try again." }, { status: 503 });
  }
}
