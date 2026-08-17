import { sql, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";

const MAX_PEOPLE = 52;
const MAX_CLUSTERS = 8;
const MAX_EDGES = 240;
const PAGE_SIZE = 25;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const categories = ["Finance", "Technology", "Design & creative", "Education", "Operations & community", "Other"] as const;
type Category = (typeof categories)[number];

type RawPerson = {
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
  can_expand: boolean;
  allow_introductions: boolean;
  degree: 1 | 2;
  shared_by: string | null;
  category: Category;
  shared_projects: number;
  skill_overlap: number;
  relevance: number;
  total_count: number;
};

type PersonNode = RawPerson & {
  kind: "person";
  reasons: string[];
  introduction_eligible: boolean;
};
type ClusterNode = {
  kind: "cluster";
  id: string;
  category: Category;
  label: string;
  count: number;
  sample: string[];
  degree: 1 | 2;
};
type NetworkEdge = { source: string; target: string; mutual: boolean; aggregate?: boolean };

const categorySql = sql`
  case
    when lower(coalesce(u.profession,'') || ' ' || coalesce(u.industry,'')) ~ '(financ|account|invest|bank)' then 'Finance'
    when lower(coalesce(u.profession,'') || ' ' || coalesce(u.industry,'')) ~ '(tech|software|engineer|data|digital)' then 'Technology'
    when lower(coalesce(u.profession,'') || ' ' || coalesce(u.industry,'')) ~ '(design|creative|brand|media|planner|architect)' then 'Design & creative'
    when lower(coalesce(u.profession,'') || ' ' || coalesce(u.industry,'')) ~ '(education|learning|teacher|programme)' then 'Education'
    when lower(coalesce(u.profession,'') || ' ' || coalesce(u.industry,'')) ~ '(operation|community|food|hospitality|logistic|nonprofit)' then 'Operations & community'
    else 'Other'
  end`;

const cursorOffset = (value: string | null) => {
  if (!value) return 0;
  try {
    const parsed = Number(Buffer.from(value, "base64url").toString("utf8"));
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 10_000 ? parsed : 0;
  } catch {
    return 0;
  }
};
const encodeCursor = (value: number) => Buffer.from(String(value)).toString("base64url");

const personNode = (row: RawPerson, focusAllowsIntroductions: boolean): PersonNode => {
  const reasons = row.degree === 2
    ? ["Known by a member you follow"]
    : row.mutual
      ? ["You follow each other"]
      : row.is_following
        ? ["You follow this member"]
        : ["This member follows you"];
  if (Number(row.shared_projects) > 0) reasons.push(`${row.shared_projects} shared ${Number(row.shared_projects) === 1 ? "project" : "projects"}`);
  if (Number(row.skill_overlap) > 0) reasons.push("Relevant skills in common");
  return {
    ...row,
    kind: "person",
    reasons: reasons.slice(0, 3),
    introduction_eligible: row.degree === 2 && focusAllowsIntroductions && Boolean(row.allow_introductions),
  };
};

function optionalFilters(query: string, cluster: string | null): SQL {
  const search = query
    ? sql`and (u.name ilike ${`%${query}%`} or u.profession ilike ${`%${query}%`} or u.industry ilike ${`%${query}%`} or u.primary_skill ilike ${`%${query}%`} or u.secondary_skill ilike ${`%${query}%`} or u.tertiary_skill ilike ${`%${query}%`})`
    : sql``;
  const category = cluster && categories.includes(cluster as Category)
    ? sql`and ${categorySql}=${cluster}`
    : sql``;
  return sql`${search} ${category}`;
}

export async function GET(request: Request) {
  try {
    const member = await requireMember(), db = getDb(), url = new URL(request.url);
    const requestedFocus = url.searchParams.get("focus");
    const focusId = requestedFocus && uuidPattern.test(requestedFocus) ? requestedFocus : null;
    const mode = url.searchParams.get("mode") === "focus" || focusId ? "focus" : "overview";
    const query = (url.searchParams.get("query") ?? "").trim().slice(0, 80);
    const cluster = url.searchParams.get("cluster");
    const offset = cursorOffset(url.searchParams.get("cursor"));
    const filters = optionalFilters(query, cluster);

    const [current] = (await db.execute(sql`
      select id,name,image,profession,industry,primary_skill,secondary_skill,tertiary_skill,bio,location,age_band
      from users where id=${member.id}
    `)) as unknown as Array<Record<string, unknown>>;
    const [viewerPreferences] = (await db.execute(sql`
      select coalesce(show_network_key,true) as show_network_key
      from privacy_settings where user_id=${member.id}
    `)) as unknown as Array<{ show_network_key: boolean }>;
    const viewerAgeBand = String(current?.age_band ?? "adult");

    let focus: RawPerson | undefined;
    if (mode === "focus" && focusId) {
      [focus] = (await db.execute(sql`
        select u.id,u.name,u.image,u.profession,u.industry,u.primary_skill,u.secondary_skill,u.tertiary_skill,u.bio,
          case when coalesce(ps.show_location,true) then u.location else null end as location,
          exists(select 1 from follows f where f.follower_id=${member.id} and f.following_id=u.id) as is_following,
          exists(select 1 from follows f where f.follower_id=u.id and f.following_id=${member.id}) as follows_viewer,
          exists(select 1 from follows a where a.follower_id=${member.id} and a.following_id=u.id)
            and exists(select 1 from follows b where b.follower_id=u.id and b.following_id=${member.id}) as mutual,
          coalesce(ps.share_network_connections,true) as can_expand,coalesce(ps.allow_introductions,true) as allow_introductions,
          1 as degree,null::uuid as shared_by,${categorySql} as category,0 as shared_projects,0 as skill_overlap,200 as relevance,1 as total_count
        from users u left join privacy_settings ps on ps.user_id=u.id
        where u.id=${focusId} and u.age_band=${viewerAgeBand}
          and u.status='active' and u.email_verified is not null and u.onboarding_completed_at is not null
          and exists(select 1 from follows f where f.follower_id=${member.id} and f.following_id=u.id)
          and not exists(select 1 from network_map_hides h where h.viewer_id=${member.id} and h.hidden_user_id=u.id)
          and not exists(select 1 from blocks b where (b.blocker_id=${member.id} and b.blocked_id=u.id) or (b.blocker_id=u.id and b.blocked_id=${member.id}))
          and not exists(select 1 from sanctions s where s.user_id=u.id and s.status='active' and (s.expires_at is null or s.expires_at>now()))
      `)) as unknown as RawPerson[];
    }

    const focusAllowed = Boolean(focus?.can_expand);
    const baseWhere = mode === "focus" && focus
      ? sql`
          u.id<>${member.id} and u.id<>${focus.id}
          and u.age_band=${viewerAgeBand}
          and not exists(select 1 from follows mine where (mine.follower_id=${member.id} and mine.following_id=u.id) or (mine.follower_id=u.id and mine.following_id=${member.id}))
          and coalesce(fps.share_network_connections,true) and coalesce(ups.share_network_connections,true)
          and (
            (exists(select 1 from follows r where r.follower_id=${focus.id} and r.following_id=u.id) and coalesce(fps.show_following,true) and coalesce(ups.show_followers,true))
            or (exists(select 1 from follows r where r.follower_id=u.id and r.following_id=${focus.id}) and coalesce(ups.show_following,true) and coalesce(fps.show_followers,true))
          )
          and coalesce(ups.profile_visibility,'network') in ('public','network')`
      : sql`
          u.id<>${member.id} and u.age_band=${viewerAgeBand}
          and (exists(select 1 from follows outgoing where outgoing.follower_id=${member.id} and outgoing.following_id=u.id) or exists(select 1 from follows incoming where incoming.follower_id=u.id and incoming.following_id=${member.id}))`;
    const privacyJoin = mode === "focus" && focus
      ? sql`left join privacy_settings ups on ups.user_id=u.id left join privacy_settings fps on fps.user_id=${focus.id}`
      : sql`left join privacy_settings ups on ups.user_id=u.id left join privacy_settings fps on false`;
    const degree = mode === "focus" && focus ? 2 : 1;
    const sharedBy = mode === "focus" && focus ? sql`${focus.id}::uuid` : sql`null::uuid`;

    const candidateSelect = sql`
      select u.id,u.name,u.image,u.profession,u.industry,u.primary_skill,u.secondary_skill,u.tertiary_skill,u.bio,
        case when coalesce(ups.show_location,true) then u.location else null end as location,
        exists(select 1 from follows f where f.follower_id=${member.id} and f.following_id=u.id) as is_following,
        exists(select 1 from follows f where f.follower_id=u.id and f.following_id=${member.id}) as follows_viewer,
        exists(select 1 from follows a where a.follower_id=${member.id} and a.following_id=u.id)
          and exists(select 1 from follows b where b.follower_id=u.id and b.following_id=${member.id}) as mutual,
        coalesce(ups.share_network_connections,true) as can_expand,coalesce(ups.allow_introductions,true) as allow_introductions,
        ${degree} as degree,${sharedBy} as shared_by,${categorySql} as category,
        (select count(*)::int from project_members mine join project_members theirs on theirs.project_id=mine.project_id where mine.user_id=${member.id} and theirs.user_id=u.id) as shared_projects,
        ((case when lower(coalesce(u.primary_skill,'')) in (lower(coalesce(${String(current?.primary_skill ?? "")},'')),lower(coalesce(${String(current?.secondary_skill ?? "")},'')),lower(coalesce(${String(current?.tertiary_skill ?? "")},''))) then 1 else 0 end)
          +(case when lower(coalesce(u.secondary_skill,'')) in (lower(coalesce(${String(current?.primary_skill ?? "")},'')),lower(coalesce(${String(current?.secondary_skill ?? "")},'')),lower(coalesce(${String(current?.tertiary_skill ?? "")},''))) then 1 else 0 end))::int as skill_overlap,
        ((case when exists(select 1 from follows a where a.follower_id=${member.id} and a.following_id=u.id) and exists(select 1 from follows b where b.follower_id=u.id and b.following_id=${member.id}) then 100 when exists(select 1 from follows f where f.follower_id=${member.id} and f.following_id=u.id) then 60 else 40 end)
          +(select count(*)*15 from project_members mine join project_members theirs on theirs.project_id=mine.project_id where mine.user_id=${member.id} and theirs.user_id=u.id))::int as relevance,
        count(*) over()::int as total_count
      from users u ${privacyJoin}
      where ${baseWhere} ${filters}
        and u.status='active' and u.email_verified is not null and u.onboarding_completed_at is not null
        and not exists(select 1 from network_map_hides h where h.viewer_id=${member.id} and h.hidden_user_id=u.id)
        and not exists(select 1 from blocks b where (b.blocker_id=${member.id} and b.blocked_id=u.id) or (b.blocker_id=u.id and b.blocked_id=${member.id}))
        and not exists(select 1 from sanctions s where s.user_id=u.id and s.status='active' and (s.expires_at is null or s.expires_at>now()))
      order by relevance desc,u.name asc`;

    const graphRows = focusAllowed || mode === "overview"
      ? (await db.execute(sql`${candidateSelect} limit ${mode === "focus" ? MAX_PEOPLE - 1 : MAX_PEOPLE}`)) as unknown as RawPerson[]
      : [];
    const listRows = focusAllowed || mode === "overview"
      ? (await db.execute(sql`${candidateSelect} limit ${PAGE_SIZE} offset ${offset}`)) as unknown as RawPerson[]
      : [];
    const total = Number(graphRows[0]?.total_count ?? 0);
    const people = graphRows.map((row) => personNode(row, Boolean(focus?.allow_introductions)));

    const visibleCounts = new Map<Category, number>();
    for (const person of people) visibleCounts.set(person.category, (visibleCounts.get(person.category) ?? 0) + 1);
    const aggregateRows = total > graphRows.length
      ? (await db.execute(sql`
          select category,count(*)::int as count,(array_agg(name order by relevance desc,name asc))[1:3] as sample
          from (${candidateSelect}) candidates group by category order by count desc limit ${MAX_CLUSTERS}
        `)) as unknown as Array<{ category: Category; count: number; sample: string[] }>
      : [];
    const clusters: ClusterNode[] = aggregateRows
      .map((row) => ({
        kind: "cluster" as const,
        id: `cluster:${degree}:${row.category.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
        category: row.category,
        label: row.category,
        count: Math.max(0, Number(row.count) - (visibleCounts.get(row.category) ?? 0)),
        sample: row.sample ?? [],
        degree: degree as 1 | 2,
      }))
      .filter((row) => row.count > 0);

    const personIds = people.map((node) => node.id);
    let edges: NetworkEdge[] = [];
    if (mode === "overview") {
      edges = people.map((node) => ({ source: member.id, target: node.id, mutual: Boolean(node.mutual) }));
    } else if (focus) {
      edges = people.map((node) => ({ source: focus!.id, target: node.id, mutual: Boolean(node.mutual) }));
      edges.unshift({ source: member.id, target: focus.id, mutual: Boolean(focus.mutual) });
    }
    if (personIds.length > 1 && edges.length < MAX_EDGES) {
      const peerEdges = (await db.execute(sql`
        select a.follower_id as source,a.following_id as target,
          exists(select 1 from follows r where r.follower_id=a.following_id and r.following_id=a.follower_id) as mutual
        from follows a
        left join privacy_settings source_ps on source_ps.user_id=a.follower_id
        left join privacy_settings target_ps on target_ps.user_id=a.following_id
        where a.follower_id in (${sql.join(personIds.map((id) => sql`${id}::uuid`), sql`, `)})
          and a.following_id in (${sql.join(personIds.map((id) => sql`${id}::uuid`), sql`, `)})
          and coalesce(source_ps.share_network_connections,true) and coalesce(target_ps.share_network_connections,true)
          and coalesce(source_ps.show_following,true) and coalesce(target_ps.show_followers,true)
          and (not exists(select 1 from follows r where r.follower_id=a.following_id and r.following_id=a.follower_id) or a.follower_id::text<a.following_id::text)
        limit ${MAX_EDGES - edges.length}
      `)) as unknown as NetworkEdge[];
      edges.push(...peerEdges);
    }
    for (const clusterNode of clusters) {
      if (edges.length >= MAX_EDGES) break;
      edges.push({ source: mode === "focus" && focus ? focus.id : member.id, target: clusterNode.id, mutual: false, aggregate: true });
    }

    if (mode === "focus" && focus) await trackProductEvent({ actorId: member.id, event: "network_focus_opened", entityType: "user", entityId: focus.id, properties: { result: focusAllowed ? "visible" : "private" } });
    if (cluster) await trackProductEvent({ actorId: member.id, event: "network_cluster_opened", entityType: "network", properties: { result: cluster } });

    const [hiddenCountRow] = (await db.execute(sql`select count(*)::int as count from network_map_hides where viewer_id=${member.id}`)) as unknown as Array<{ count: number }>;
    return NextResponse.json({
      mode,
      current,
      nodes: [...(focus ? [personNode(focus, Boolean(focus.allow_introductions))] : []), ...people, ...clusters],
      edges: edges.slice(0, MAX_EDGES),
      totals: { visible: total + (focus ? 1 : 0), rendered: people.length + clusters.length + (focus ? 1 : 0), aggregated: Math.max(0, total - people.length), hidden: Number(hiddenCountRow?.count ?? 0) },
      list: {
        items: listRows.map((row) => personNode(row, Boolean(focus?.allow_introductions))),
        cursor: offset ? encodeCursor(Math.max(0, offset - PAGE_SIZE)) : null,
        nextCursor: offset + listRows.length < total ? encodeCursor(offset + PAGE_SIZE) : null,
        total,
      },
      preferences: { showNetworkKey: viewerPreferences?.show_network_key ?? true },
      focus: focusId ? { id: focusId, expanded: focusAllowed, visibleCount: total, reason: !focus ? "not-following" : focusAllowed ? null : "private" } : null,
      viewport: { minScale: 0.45, maxScale: 2.2, suggestedScale: mode === "focus" ? (total > 30 ? 0.82 : total > 12 ? 1 : 1.18) : total > 40 ? 0.68 : 0.9 },
      limits: { nodes: 60, edges: MAX_EDGES, pageSize: PAGE_SIZE },
    });
  } catch (error) {
    return apiError(error);
  }
}
