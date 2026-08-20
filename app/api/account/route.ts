import { compare } from "bcryptjs";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  accessibilitySettings,
  accounts,
  adminAssignments,
  adminMfa,
  authenticators,
  careerHistory,
  contentDrafts,
  educationHistory,
  integrationAccounts,
  memberEmbeddings,
  notificationPreferences,
  notifications,
  privacySettings,
  projects,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { enforceDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  confirmation: z.literal("DELETE"),
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
      db.select({ email: users.email, passwordHash: users.passwordHash, status: users.status }).from(users).where(eq(users.id, member.id)).limit(1),
      db.select({ id: adminAssignments.id }).from(adminAssignments).where(and(eq(adminAssignments.userId, member.id), eq(adminAssignments.status, "active"))).limit(1),
    ]);
    if (!record || record.status !== "active") throw new ApiError(404, "Account not found.");
    if (activeAdmin) throw new ApiError(409, "Remove your active administrator access before deleting this account.");
    if (record.passwordHash && (!input.password || !(await compare(input.password, record.passwordHash)))) {
      throw new ApiError(400, "Your current password is incorrect.");
    }

    const deletedIdentity = member.id.replaceAll("-", "");
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.update(projects).set({ status: "archived", visibility: "private", updatedAt: now }).where(and(eq(projects.ownerId, member.id), notInArray(projects.status, ["pending_deletion", "deleted"])));
      await tx.delete(accounts).where(eq(accounts.userId, member.id));
      await tx.delete(sessions).where(eq(sessions.userId, member.id));
      await tx.delete(authenticators).where(eq(authenticators.userId, member.id));
      await tx.delete(integrationAccounts).where(eq(integrationAccounts.userId, member.id));
      await tx.delete(contentDrafts).where(eq(contentDrafts.ownerId, member.id));
      await tx.delete(careerHistory).where(eq(careerHistory.userId, member.id));
      await tx.delete(educationHistory).where(eq(educationHistory.userId, member.id));
      await tx.delete(notifications).where(eq(notifications.userId, member.id));
      await tx.delete(notificationPreferences).where(eq(notificationPreferences.userId, member.id));
      await tx.delete(privacySettings).where(eq(privacySettings.userId, member.id));
      await tx.delete(accessibilitySettings).where(eq(accessibilitySettings.userId, member.id));
      await tx.delete(memberEmbeddings).where(eq(memberEmbeddings.userId, member.id));
      await tx.delete(adminMfa).where(eq(adminMfa.userId, member.id));
      await tx.delete(adminAssignments).where(eq(adminAssignments.userId, member.id));
      await tx.delete(verificationTokens).where(inArray(verificationTokens.identifier, [
        `verify:${record.email}`,
        `reset:${record.email}`,
        `onboarding:${record.email}`,
      ]));
      await tx.update(users).set({
        title: null,
        firstName: null,
        lastName: null,
        age: null,
        dateOfBirth: null,
        ageBand: "adult",
        name: "Deleted member",
        username: `deleted_${deletedIdentity}`,
        email: `deleted+${deletedIdentity}@nice2.invalid`,
        emailVerified: null,
        image: null,
        coverImage: null,
        passwordHash: null,
        profession: null,
        headline: null,
        bio: null,
        industry: null,
        primarySkill: null,
        secondarySkill: null,
        tertiarySkill: null,
        skills: [],
        interests: [],
        location: null,
        city: null,
        country: null,
        timezone: "Europe/London",
        workMode: "remote",
        availability: "closed",
        role: "deleted",
        status: "deleted",
        sessionVersion: sql`${users.sessionVersion} + 1`,
        forcePasswordChange: false,
        mfaEnrolledAt: null,
        onboardingCompletedAt: null,
        updatedAt: now,
      }).where(eq(users.id, member.id));
    });
    await audit(member.id, "account.deleted", "user", member.id, { profileAnonymised: true, ownedProjectsArchived: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
