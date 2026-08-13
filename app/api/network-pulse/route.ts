import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { apiError } from "@/lib/api";

export async function GET() {
  try {
    const db = getDb();
    const progress = await db.execute(sql`select p.id, p.title, count(m.id)::int as total, count(m.id) filter (where m.status = 'completed')::int as completed from projects p left join milestones m on m.project_id = p.id where p.status = 'active' and p.visibility = 'network' group by p.id, p.title order by p.updated_at desc limit 12`);
    const [connections] = await db.execute(sql`select count(*)::int as value from project_members where membership_role not in ('owner','co_owner') and joined_at >= now() - interval '7 days'`);
    const [topComment] = await db.execute(sql`select pc.body, u.name as author, p.title as project_title from project_comments pc join users u on u.id = pc.author_id join projects p on p.id = pc.project_id where pc.status = 'visible' and p.status = 'active' order by pc.created_at desc limit 1`);
    const [mostEyes] = await db.execute(sql`select p.id, p.title, count(pe.user_id)::int as value from projects p join project_eyes pe on pe.project_id = p.id join users u on u.id = pe.user_id where p.status = 'active' and u.status = 'active' and pe.user_id <> p.owner_id group by p.id, p.title order by value desc, p.title asc limit 1`);
    const [mostEngaged] = await db.execute(sql`select p.id, p.title, (count(distinct pe.user_id) + count(distinct pc.id) * 2 + count(distinct pm.user_id) * 3)::int as value from projects p left join project_eyes pe on pe.project_id = p.id and pe.user_id <> p.owner_id left join project_comments pc on pc.project_id = p.id and pc.status = 'visible' left join project_members pm on pm.project_id = p.id where p.status = 'active' group by p.id, p.title order by value desc, p.title asc limit 1`);
    const projectSlides = progress.map(row => { const total = Number(row.total), completed = Number(row.completed), percent = total ? Math.round(completed / total * 100) : 0; return { id: `progress-${row.id}`, kind: "progress", label: "PROJECT PROGRESS", value: `${percent}%`, title: String(row.title), detail: total ? `${completed} of ${total} milestones complete` : "Milestones are being planned", progress: percent, projectId: String(row.id) }; });
    const slides = [
      ...projectSlides,
      { id: "connections", kind: "connections", label: "NEW CONNECTIONS", value: String(Number(connections?.value ?? 0)), title: "new project connections this week", detail: "People joining projects together", progress: 72 },
      ...(topComment ? [{ id: "top-comment", kind: "comment", label: "TOP COMMENT", value: "“", title: String(topComment.body), detail: `${topComment.author ?? "n2 member"} · ${topComment.project_title}`, progress: 58 }] : []),
      ...(mostEyes ? [{ id: "most-views", kind: "views", label: "MOST VIEWS", value: String(mostEyes.value), title: String(mostEyes.title), detail: "Most viewed active project", progress: 88, projectId: String(mostEyes.id) }] : []),
      ...(mostEngaged ? [{ id: "most-engaged", kind: "engagement", label: "MOST ENGAGED", value: String(mostEngaged.value), title: String(mostEngaged.title), detail: "Views, comments and contributors", progress: 94, projectId: String(mostEngaged.id) }] : []),
    ];
    return NextResponse.json({ slides });
  } catch (error) { return apiError(error); }
}
