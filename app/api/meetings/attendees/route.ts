import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { blocks, follows, privacySettings, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const member = await requireMember();
    const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
    const db = getDb();
    const [viewer] = await db.select({ ageBand: users.ageBand }).from(users).where(eq(users.id, member.id)).limit(1);
    const allowedAgeBands = viewer?.ageBand === "teen_16_17" ? ["teen_16_17"] : ["adult", "adult_18_24", "adult_25_plus"];
    const viewerFollows = sql<boolean>`exists(select 1 from ${follows} mine where mine.follower_id=${member.id} and mine.following_id=${users.id})`;
    const followsViewer = sql<boolean>`exists(select 1 from ${follows} theirs where theirs.follower_id=${users.id} and theirs.following_id=${member.id})`;
    const isBlocked = sql<boolean>`exists(select 1 from ${blocks} b where (b.blocker_id=${member.id} and b.blocked_id=${users.id}) or (b.blocker_id=${users.id} and b.blocked_id=${member.id}))`;
    const term = `%${query}%`;
    const rows = await db.select({ id: users.id, name: users.name, image: users.image, profession: users.profession, viewerFollows, followsViewer })
      .from(users).leftJoin(privacySettings, eq(privacySettings.userId, users.id)).where(and(
        ne(users.id, member.id), eq(users.status, "active"), inArray(users.ageBand, allowedAgeBands),
        sql`${users.emailVerified} is not null`, sql`${users.onboardingCompletedAt} is not null`, sql`not (${isBlocked})`,
        or(viewerFollows, followsViewer, eq(privacySettings.profileVisibility, "public"), eq(privacySettings.profileVisibility, "network"), sql`${privacySettings.userId} is null`),
        ...(query.length >= 2 ? [or(sql`${users.name} ilike ${term}`, sql`${users.profession} ilike ${term}`)!] : []),
      )).orderBy(sql`(${viewerFollows} and ${followsViewer}) desc`, followsViewer, viewerFollows, users.name).limit(100);
    return NextResponse.json({ people: rows.map(person => ({
      id: person.id, name: person.name ?? "n2 member", image: person.image, profession: person.profession ?? "n2 member",
      group: person.viewerFollows && person.followsViewer ? "connections" : person.followsViewer ? "followers" : "public",
      relationship: person.viewerFollows && person.followsViewer ? "Mutual connection" : person.followsViewer ? "Follows you" : person.viewerFollows ? "You follow them" : "Public profile",
    })) });
  } catch (error) { return apiError(error); }
}
