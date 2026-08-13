import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { privacySettings, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";

export async function GET() {
  try {
    const member=await requireMember(),db=getDb();
    const [viewer]=await db.select({ageBand:users.ageBand}).from(users).where(eq(users.id,member.id)).limit(1);
    const allowed=viewer?.ageBand==="teen_16_17"?["teen_16_17"]:["adult","adult_18_24","adult_25_plus"];
    const joiners=await db.select({id:users.id,name:users.name,image:users.image,profession:users.profession,createdAt:users.createdAt}).from(users).leftJoin(privacySettings,eq(privacySettings.userId,users.id)).where(and(ne(users.id,member.id),eq(users.status,"active"),inArray(users.ageBand,allowed),sql`${users.onboardingCompletedAt} is not null`,or(eq(privacySettings.profileVisibility,"public"),eq(privacySettings.profileVisibility,"network"),sql`${privacySettings.userId} is null`))).orderBy(desc(users.createdAt)).limit(8);
    return NextResponse.json({joiners});
  } catch(error) { return apiError(error) }
}
