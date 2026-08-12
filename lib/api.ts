import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireMember() {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "Sign in required");
  return session.user;
}

export class ApiError extends Error { constructor(public status:number, message:string){super(message)} }
export function apiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "Check the submitted fields.", details: JSON.parse(error.message) }, { status: 400 });
  console.error(error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
