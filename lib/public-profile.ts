import "server-only";
import { cache } from "react";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { privacySettings, users } from "@/db/schema";

export const getSharedProfileIdentity = cache(async (username: string) => {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [profile] = await db.select({
    id: users.id,
    username: users.username,
    name: users.name,
    image: users.image,
    profession: users.profession,
    headline: users.headline,
    bio: users.bio,
    location: users.location,
    showLocation: privacySettings.showLocation,
    visibility: privacySettings.profileVisibility,
    status: users.status,
  }).from(users).leftJoin(privacySettings, eq(privacySettings.userId, users.id)).where(and(
    eq(users.username, username.toLowerCase()),
    inArray(users.status, ["active", "deactivated"]),
    isNotNull(users.emailVerified),
  )).limit(1);
  return profile ?? null;
});
