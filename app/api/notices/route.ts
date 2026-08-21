import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { adminAssignments, officialNotices, users } from "@/db/schema";
import { apiError } from "@/lib/api";

export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ notices: [] });
  try {
    const now = new Date();
    const featuredSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const notices = await getDb().select({
      id: officialNotices.id, title: officialNotices.title, body: officialNotices.body,
      audience: officialNotices.audience, publishedAt: officialNotices.publishedAt,
      authorName: users.name,
    }).from(officialNotices)
      .innerJoin(users, eq(users.id, officialNotices.authorId))
      .innerJoin(adminAssignments, and(eq(adminAssignments.userId, officialNotices.authorId), eq(adminAssignments.status, "active")))
      .where(and(
        eq(officialNotices.status, "published"),
        gt(officialNotices.publishedAt, featuredSince),
        or(isNull(officialNotices.expiresAt), gt(officialNotices.expiresAt, now)),
      ))
      .orderBy(desc(officialNotices.publishedAt)).limit(3);
    return NextResponse.json({ notices });
  } catch (error) { return apiError(error); }
}
