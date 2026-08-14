import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { apiError, requireMember } from "@/lib/api";

type NetworkNode = {
  id: string;
  name: string | null;
  image: string | null;
  profession: string | null;
  industry: string | null;
  primary_skill: string | null;
  secondary_skill: string | null;
  tertiary_skill: string | null;
  bio: string | null;
  location: string | null;
  mutual: boolean;
  is_following: boolean;
  follows_viewer: boolean;
};
type NetworkEdge = { source: string; target: string; mutual: boolean };

export async function GET() {
  try {
    const member = await requireMember(),
      db = getDb();
    const [current] = (await db.execute(
      sql`select id,name,image,profession,industry,primary_skill,secondary_skill,tertiary_skill,bio,location from users where id=${member.id}`,
    )) as unknown as Array<Record<string, unknown>>;
    const nodes = (await db.execute(sql`
      select u.id,u.name,u.image,u.profession,u.industry,u.primary_skill,u.secondary_skill,u.tertiary_skill,u.bio,
        case when coalesce(ps.show_location,true) then u.location else null end as location,
        exists(select 1 from follows outgoing where outgoing.follower_id=${member.id} and outgoing.following_id=u.id) as is_following,
        exists(select 1 from follows incoming where incoming.follower_id=u.id and incoming.following_id=${member.id}) as follows_viewer,
        exists(select 1 from follows outgoing where outgoing.follower_id=${member.id} and outgoing.following_id=u.id)
          and exists(select 1 from follows incoming where incoming.follower_id=u.id and incoming.following_id=${member.id}) as mutual
      from users u
      left join privacy_settings ps on ps.user_id=u.id
      where u.id<>${member.id}
        and (
          exists(select 1 from follows outgoing where outgoing.follower_id=${member.id} and outgoing.following_id=u.id)
          or exists(select 1 from follows incoming where incoming.follower_id=u.id and incoming.following_id=${member.id})
        )
        and u.status='active' and u.email_verified is not null and u.onboarding_completed_at is not null
        and not exists(select 1 from blocks b where (b.blocker_id=${member.id} and b.blocked_id=u.id) or (b.blocker_id=u.id and b.blocked_id=${member.id}))
        and not exists(select 1 from sanctions s where s.user_id=u.id and s.status='active' and (s.expires_at is null or s.expires_at>now()))
      order by mutual desc,u.name asc limit 80
    `)) as unknown as NetworkNode[];
    const ids = nodes.map((node) => node.id);
    let edges: NetworkEdge[] = nodes.map((node) => ({
      source: member.id,
      target: node.id,
      mutual: Boolean(node.mutual),
    }));
    if (ids.length > 1) {
      const peerEdges = (await db.execute(sql`
        select a.follower_id as source,a.following_id as target,true as mutual
        from follows a join follows b on b.follower_id=a.following_id and b.following_id=a.follower_id
        join privacy_settings pa on pa.user_id=a.follower_id join privacy_settings pb on pb.user_id=a.following_id
        where a.follower_id in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)}) and a.following_id in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})
          and a.follower_id::text<a.following_id::text and pa.show_followers=true and pa.show_following=true and pb.show_followers=true and pb.show_following=true
      `)) as unknown as NetworkEdge[];
      edges = [...edges, ...peerEdges];
    }
    return NextResponse.json({ current, nodes, edges });
  } catch (error) {
    return apiError(error);
  }
}
