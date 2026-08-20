import { compare } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  adminAssignments,
  users,
} from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { initiateAccountDeactivation } from "@/lib/account-lifecycle";
import { audit } from "@/lib/audit";
import { enforceDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  confirmation: z.literal("DELETE"),
  consequencesAccepted: z.literal(true),
  password: z.string().max(128).optional(),
});

export async function DELETE(request: Request) {
  try {
    const member = await requireMember();
    enforceRateLimit(`account-delete:${member.id}`, 5, 60 * 60_000);
    await enforceDistributedRateLimit(`account-delete:${member.id}`, 5, 60 * 60_000);
    const input = schema.parse(await request.json());
    const db = getDb();
    const [[record], [activeAdmin]] = await Promise.all([
      db.select({ passwordHash: users.passwordHash, status: users.status }).from(users).where(eq(users.id, member.id)).limit(1),
      db.select({ id: adminAssignments.id }).from(adminAssignments).where(and(eq(adminAssignments.userId, member.id), eq(adminAssignments.status, "active"))).limit(1),
    ]);
    if (!record || record.status !== "active") throw new ApiError(404, "Account not found.");
    if (activeAdmin) throw new ApiError(409, "Remove your active administrator access before deleting this account.");
    if (record.passwordHash && (!input.password || !(await compare(input.password, record.passwordHash)))) {
      throw new ApiError(400, "Your current password is incorrect.");
    }

    const result = await initiateAccountDeactivation(member.id);
    await audit(member.id, "account.deactivated", "user", member.id, {
      recoveryDeadline: result.recoveryDeadline.toISOString(),
      ownershipTransfers: result.transferred,
      leadershipElections: result.elections,
      cancelledMeets: result.cancelledMeets,
    }, { severity: "high" });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return apiError(error);
  }
}
