import "server-only";
import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { notificationPreferences, notifications } from "@/db/schema";

export type NotificationType = "message" | "project" | "application" | "invitation" | "match" | "meet" | "official" | "safety" | "account";

export async function createNotification(input: {
  userId: string; actorId?: string | null; type: NotificationType; title: string; body: string;
  entityType?: string; entityId?: string; href?: string;
}) {
  await createNotifications([input]);
}

export async function createNotifications(inputs: Parameters<typeof createNotification>[0][]) {
  const candidates = inputs.filter(item => item.actorId !== item.userId);
  if (!candidates.length) return;
  const preferences = await getDb().select().from(notificationPreferences).where(inArray(notificationPreferences.userId, [...new Set(candidates.map(item=>item.userId))]));
  const byUser = new Map(preferences.map(item=>[item.userId,item]));
  const values = candidates.filter(item => {
    const preference=byUser.get(item.userId); if(!preference)return true;
    if(item.type==="message")return preference.messages;
    if(["project","application","invitation"].includes(item.type))return preference.projects;
    if(item.type==="match")return preference.matches;
    if(item.type==="meet")return preference.meets;
    if(item.type==="official")return preference.officialNotices;
    return true;
  });
  if (values.length) await getDb().insert(notifications).values(values);
}
