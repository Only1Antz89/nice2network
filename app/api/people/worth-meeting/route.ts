import { NextResponse } from "next/server";
import { apiError, requireMember } from "@/lib/api";
import { recommendWorthMeeting } from "@/lib/people-recommendations";

export async function GET() {
  try {
    const member = await requireMember();
    const worthMeeting = await recommendWorthMeeting(member.id);
    return NextResponse.json({ worthMeeting }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
