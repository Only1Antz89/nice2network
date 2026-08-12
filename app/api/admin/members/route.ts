import { desc, eq, ilike, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { adminAssignments, users } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const admin = await requirePermission("members.read");
    const query = new URL(request.url).searchParams.get("q")?.trim();
    const rows = await getDb().select({ id: users.id, name: users.name, email: users.email, image: users.image, profession: users.profession, status: users.status, ageBand: users.ageBand, createdAt: users.createdAt, adminRole: adminAssignments.role, adminStatus: adminAssignments.status }).from(users).leftJoin(adminAssignments, eq(adminAssignments.userId, users.id)).where(query ? or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`), ilike(users.profession, `%${query}%`)) : undefined).orderBy(desc(users.createdAt)).limit(100);
    await audit(admin.user.id, "admin.members_viewed", "user", undefined, { queryUsed: Boolean(query) }, { permission: "members.read" });
    return NextResponse.json({ members: rows });
  } catch (error) { return apiError(error); }
}
