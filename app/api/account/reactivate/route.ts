import { compare } from "bcryptjs";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projectLeadershipElections, projectMembers, projects, users } from "@/db/schema";
import { ApiError, apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { enforceDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email().max(320).transform(value => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    enforceRateLimit(`account-reactivate:${input.email}`, 5, 60 * 60_000);
    await enforceDistributedRateLimit(`account-reactivate:${input.email}`, 5, 60 * 60_000);
    const db = getDb();
    const now = new Date();
    const [account] = await db.select({ id: users.id, passwordHash: users.passwordHash, deletionRequestedAt: users.deletionRequestedAt }).from(users).where(and(
      eq(users.email, input.email),
      eq(users.status, "deactivated"),
      gt(users.recoveryDeadline, now),
    )).limit(1);
    if (!account?.passwordHash || !(await compare(input.password, account.passwordHash))) throw new ApiError(400, "Those account details could not be verified, or the reactivation window has ended.");
    const retainedProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, account.id));
    await db.transaction(async tx => {
      await tx.update(users).set({
        status: "active",
        availability: "open",
        deactivatedAt: null,
        deletionRequestedAt: null,
        recoveryDeadline: null,
        sessionVersion: sql`${users.sessionVersion} + 1`,
        updatedAt: now,
      }).where(and(eq(users.id, account.id), eq(users.status, "deactivated"), gt(users.recoveryDeadline, now)));
      await tx.update(projectLeadershipElections).set({ status: "cancelled", completedAt: now }).where(and(
        eq(projectLeadershipElections.formerOwnerId, account.id),
        eq(projectLeadershipElections.status, "open"),
      ));
      if (retainedProjects.length) await tx.update(projectMembers).set({ membershipRole: "owner" }).where(and(
        eq(projectMembers.userId, account.id),
        inArray(projectMembers.projectId, retainedProjects.map(project => project.id)),
      ));
    });
    await audit(account.id, "account.reactivated", "user", account.id, { deletionCancelled: Boolean(account.deletionRequestedAt), pendingLeadershipElectionsCancelled: true }, { severity: "high" });
    return NextResponse.json({ success: true, message: "Your account is active again. Cancelled meets and completed ownership transfers are not automatically reversed." });
  } catch (error) {
    return apiError(error);
  }
}
