import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";

export async function GET(request: Request) {
  try {
    const member = await requireMember(), url = new URL(request.url), targetId = url.searchParams.get("target"), viaId = url.searchParams.get("via");
    if (!targetId || !z.uuid().safeParse(targetId).success || (viaId && !z.uuid().safeParse(viaId).success)) throw new ApiError(400, "Choose a visible member");
    const [row] = (await getDb().execute(sql`
      select u.id,
        exists(select 1 from follows f where f.follower_id=${member.id} and f.following_id=u.id) as is_following,
        exists(select 1 from follows f where f.follower_id=u.id and f.following_id=${member.id}) as follows_viewer,
        (select count(*)::int from project_members a join project_members b on b.project_id=a.project_id where a.user_id=${member.id} and b.user_id=u.id) as shared_projects,
        case when ${viaId}::uuid is null then false else exists(
          select 1 from users connector
          left join privacy_settings cps on cps.user_id=connector.id
          left join privacy_settings tps on tps.user_id=u.id
          where connector.id=${viaId}::uuid
            and exists(select 1 from follows mine where mine.follower_id=${member.id} and mine.following_id=connector.id)
            and coalesce(cps.share_network_connections,true) and coalesce(tps.share_network_connections,true)
            and ((exists(select 1 from follows path where path.follower_id=connector.id and path.following_id=u.id) and coalesce(cps.show_following,true) and coalesce(tps.show_followers,true))
              or (exists(select 1 from follows path where path.follower_id=u.id and path.following_id=connector.id) and coalesce(tps.show_following,true) and coalesce(cps.show_followers,true)))
        ) end as via_valid
      from users u where u.id=${targetId}
        and not exists(select 1 from network_map_hides h where h.viewer_id=${member.id} and h.hidden_user_id=u.id)
        and not exists(select 1 from blocks b where (b.blocker_id=${member.id} and b.blocked_id=u.id) or (b.blocker_id=u.id and b.blocked_id=${member.id}))
    `)) as unknown as Array<{ id: string; is_following: boolean; follows_viewer: boolean; shared_projects: number; via_valid: boolean }>;
    if (!row) throw new ApiError(404, "Member not found");
    const reasons = row.is_following && row.follows_viewer ? ["You follow each other"] : row.is_following ? ["You follow this member"] : row.follows_viewer ? ["This member follows you"] : row.via_valid ? ["Known by a member you follow"] : [];
    if (Number(row.shared_projects) > 0) reasons.push(`${row.shared_projects} shared ${Number(row.shared_projects) === 1 ? "project" : "projects"}`);
    if (!reasons.length) throw new ApiError(403, "This connection path is unavailable");
    await trackProductEvent({ actorId: member.id, event: "network_explanation_opened", entityType: "user", entityId: targetId });
    return NextResponse.json({ reasons: reasons.slice(0, 3) });
  } catch (error) { return apiError(error); }
}
