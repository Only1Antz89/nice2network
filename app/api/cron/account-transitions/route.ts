import { NextResponse } from "next/server";
import { processDueAccountTransitions } from "@/lib/account-lifecycle";
import { finalizeDueAdminAccountDeletions, sweepExpiredSuspensions } from "@/lib/admin-account-lifecycle";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [accountTransitions, expiredSuspensions, finalizedAdminDeletions] = await Promise.all([
    processDueAccountTransitions(),
    sweepExpiredSuspensions(),
    finalizeDueAdminAccountDeletions(),
  ]);
  return NextResponse.json({ ...accountTransitions, expiredSuspensions: expiredSuspensions.map(row => row.id), finalizedAdminDeletions });
}
