import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { reports } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema = z.object({
  targetType: z.enum(["user", "project", "message", "update"]), targetId: z.uuid(),
  reason: z.enum(["harassment", "fraud", "impersonation", "exploitation", "sexual_content", "self_harm", "credible_threat", "spam", "misinformation", "unsafe_project", "privacy", "other"]),
  details: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const member = await requireMember(), input = schema.parse(await request.json());
    const urgent = ["exploitation", "sexual_content", "self_harm", "credible_threat"].includes(input.reason);
    const high = ["harassment", "fraud", "impersonation", "unsafe_project", "privacy"].includes(input.reason);
    const priority = urgent ? "urgent" : high ? "high" : input.reason === "spam" ? "low" : "normal";
    const targetMs = priority === "urgent" ? 15 * 60_000 : priority === "high" ? 4 * 3_600_000 : priority === "normal" ? 24 * 3_600_000 : 3 * 86_400_000;
    const [report] = await getDb().insert(reports).values({ ...input, priority, responseDueAt: new Date(Date.now() + targetMs), reporterId: member.id }).returning({ id: reports.id, status: reports.status });
    await audit(member.id, "report.created", input.targetType, input.targetId, { reportId: report.id, reason: input.reason, priority });
    return NextResponse.json(report, { status: 201 });
  } catch (error) { return apiError(error); }
}
