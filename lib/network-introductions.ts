import "server-only";
import { sql } from "drizzle-orm";
import { ApiError } from "@/lib/api";

type IntroductionParty = {
  id: string;
  name: string | null;
  age_band: string;
  allow_introductions: boolean;
};

export async function validateIntroductionPath(
  db: ReturnType<typeof import("@/db").getDb>,
  requesterId: string,
  connectorId: string,
  targetId: string,
) {
  if (new Set([requesterId, connectorId, targetId]).size !== 3) throw new ApiError(400, "Choose two different members");
  const parties = (await db.execute(sql`
    select u.id,u.name,u.age_band,coalesce(ps.allow_introductions,true) as allow_introductions
    from users u left join privacy_settings ps on ps.user_id=u.id
    where u.id in (${requesterId}::uuid,${connectorId}::uuid,${targetId}::uuid)
      and u.status='active' and u.email_verified is not null and u.onboarding_completed_at is not null
  `)) as unknown as IntroductionParty[];
  if (parties.length !== 3) throw new ApiError(404, "One or more members are unavailable");
  const requester = parties.find((party) => party.id === requesterId)!;
  const connector = parties.find((party) => party.id === connectorId)!;
  const target = parties.find((party) => party.id === targetId)!;
  if (!connector.allow_introductions || !target.allow_introductions) throw new ApiError(403, "This introduction is unavailable");
  if (new Set(parties.map((party) => party.age_band)).size !== 1) throw new ApiError(403, "This introduction is unavailable");

  const [path] = (await db.execute(sql`
    select
      exists(select 1 from follows f where f.follower_id=${requesterId} and f.following_id=${connectorId}) as requester_follows_connector,
      coalesce(cps.share_network_connections,true) as connector_shares,
      coalesce(tps.share_network_connections,true) as target_shares,
      (
        (exists(select 1 from follows f where f.follower_id=${connectorId} and f.following_id=${targetId}) and coalesce(cps.show_following,true) and coalesce(tps.show_followers,true))
        or
        (exists(select 1 from follows f where f.follower_id=${targetId} and f.following_id=${connectorId}) and coalesce(tps.show_following,true) and coalesce(cps.show_followers,true))
      ) as connector_knows_target
    from users connector
    left join privacy_settings cps on cps.user_id=${connectorId}
    left join privacy_settings tps on tps.user_id=${targetId}
    where connector.id=${connectorId}
  `)) as unknown as Array<{ requester_follows_connector: boolean; connector_shares: boolean; target_shares: boolean; connector_knows_target: boolean }>;
  if (!path?.requester_follows_connector || !path.connector_shares || !path.target_shares || !path.connector_knows_target) throw new ApiError(403, "This introduction path is no longer available");

  const [restricted] = (await db.execute(sql`
    select 1 from blocks b
    where b.blocker_id in (${requesterId}::uuid,${connectorId}::uuid,${targetId}::uuid)
      and b.blocked_id in (${requesterId}::uuid,${connectorId}::uuid,${targetId}::uuid)
    union all
    select 1 from sanctions s where s.user_id in (${requesterId}::uuid,${connectorId}::uuid,${targetId}::uuid)
      and s.status='active' and (s.expires_at is null or s.expires_at>now())
    limit 1
  `)) as unknown as Array<{ value: number }>;
  if (restricted) throw new ApiError(403, "This introduction is unavailable");
  return { requester, connector, target };
}
