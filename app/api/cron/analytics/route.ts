import { count, gte, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { dailyMetrics, productEvents } from "@/db/schema";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const end = new Date(); end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 1);
  const rows = await db.select({ event: productEvents.event, value: count() }).from(productEvents).where(gte(productEvents.occurredAt, start)).groupBy(productEvents.event);
  for (const row of rows) {
    await db.insert(dailyMetrics).values({ day: start.toISOString().slice(0, 10), metric: row.event, dimension: "all", value: row.value })
      .onConflictDoUpdate({ target: [dailyMetrics.day, dailyMetrics.metric, dailyMetrics.dimension], set: { value: row.value, updatedAt: new Date() } });
  }
  const cutoff = new Date(end); cutoff.setUTCDate(cutoff.getUTCDate() - 90);
  await db.delete(productEvents).where(lt(productEvents.occurredAt, cutoff));
  return NextResponse.json({ aggregatedDay: start.toISOString().slice(0, 10), metrics: rows.length, retentionDays: 90 });
}
