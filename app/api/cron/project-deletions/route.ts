import { NextResponse } from "next/server";
import { finalizeDueProjectDeletions } from "@/lib/project-deletion";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const finalized = await finalizeDueProjectDeletions();
  return NextResponse.json({ finalized: finalized.length, projectIds: finalized });
}
