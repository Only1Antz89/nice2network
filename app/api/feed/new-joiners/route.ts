import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { privacySettings, projectMembers, projectRoles, projects, users } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";

export async function GET() {
  try {
    const member=await requireMember(),db=getDb();
    const [viewer]=await db.select({ageBand:users.ageBand}).from(users).where(eq(users.id,member.id)).limit(1);
    const allowed=viewer?.ageBand==="teen_16_17"?["teen_16_17"]:["adult","adult_18_24","adult_25_plus"];
    const visibleMember = and(
      ne(users.id,member.id),
      eq(users.status,"active"),
      inArray(users.ageBand,allowed),
      sql`${users.onboardingCompletedAt} is not null`,
      or(eq(privacySettings.profileVisibility,"public"),eq(privacySettings.profileVisibility,"network"),sql`${privacySettings.userId} is null`),
    );
    const [newMembers, projectJoins] = await Promise.all([
      db.select({
        id: users.id,
        memberId: users.id,
        name: users.name,
        image: users.image,
        profession: users.profession,
        activityType: sql<"network_join">`'network_join'`,
        projectId: sql<string | null>`null`,
        projectTitle: sql<string | null>`null`,
        roleTitle: sql<string | null>`null`,
        createdAt: users.createdAt,
      }).from(users).leftJoin(privacySettings,eq(privacySettings.userId,users.id)).where(visibleMember).orderBy(desc(users.createdAt)).limit(8),
      db.select({
        id: sql<string>`${projectMembers.projectId}::text || ':' || ${projectMembers.userId}::text`,
        memberId: users.id,
        name: users.name,
        image: users.image,
        profession: users.profession,
        activityType: sql<"project_join">`'project_join'`,
        projectId: projects.id,
        projectTitle: projects.title,
        roleTitle: sql<string>`coalesce(${projectRoles.title}, case when ${projectMembers.membershipRole} = 'co_owner' then 'Co-owner' else nullif(${projectMembers.department}, '') end, 'Project contributor')`,
        createdAt: projectMembers.joinedAt,
      }).from(projectMembers)
        .innerJoin(users,eq(users.id,projectMembers.userId))
        .innerJoin(projects,eq(projects.id,projectMembers.projectId))
        .leftJoin(projectRoles,eq(projectRoles.id,projectMembers.roleId))
        .leftJoin(privacySettings,eq(privacySettings.userId,users.id))
        .where(and(
          visibleMember,
          eq(projects.status,"active"),
          eq(projects.visibility,"network"),
          ne(projectMembers.membershipRole,"owner"),
          ne(projectMembers.membershipRole,"former_owner"),
        )).orderBy(desc(projectMembers.joinedAt)).limit(12),
    ]);
    const joiners=[...newMembers,...projectJoins]
      .sort((left,right)=>right.createdAt.getTime()-left.createdAt.getTime()||left.id.localeCompare(right.id))
      .slice(0,12);
    return NextResponse.json({joiners},{headers:{"Cache-Control":"private, no-store"}});
  } catch(error) { return apiError(error) }
}
