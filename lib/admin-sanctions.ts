import "server-only";
import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { sanctions } from "@/db/schema";

export const sanctionTypes = {
  warn: "warning",
  restrict_messaging: "messaging_restriction",
  restrict_invitations: "invitation_restriction",
  restrict_meetings: "meeting_restriction",
  suspend: "suspension",
  ban: "ban",
} as const;

export type AdminSanctionAction = keyof typeof sanctionTypes;
export type SanctionType = typeof sanctionTypes[AdminSanctionAction];

export const accountRestrictionTypes: SanctionType[] = ["suspension", "ban"];

export function activeSanctionCondition(userId: string, types: SanctionType[]) {
  return and(
    eq(sanctions.userId, userId),
    eq(sanctions.status, "active"),
    inArray(sanctions.type, types),
    or(isNull(sanctions.expiresAt), gt(sanctions.expiresAt, new Date())),
  );
}

export async function hasActiveSanction(userId: string, types: SanctionType[]) {
  const [row] = await getDb().select({ id: sanctions.id }).from(sanctions).where(activeSanctionCondition(userId, types)).limit(1);
  return Boolean(row);
}
