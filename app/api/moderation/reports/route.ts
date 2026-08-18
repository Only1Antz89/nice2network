import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { reports } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { enforceDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { getModerationTarget, moderationTargetTypes } from "@/lib/moderation-targets";

const schema = z.object({
  targetType: z.enum(moderationTargetTypes), targetId: z.uuid(),
  reason: z.enum(["harassment", "fraud", "impersonation", "exploitation", "sexual_content", "self_harm", "credible_threat", "spam", "misinformation", "unsafe_project", "privacy", "other"]),
  details: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const member = await requireMember(), input = schema.parse(await request.json());
    await enforceDistributedRateLimit(`reports:${member.id}`, 12, 60 * 60_000);
    if (input.targetType === "user" && input.targetId === member.id) throw new ApiError(400, "You cannot report your own account");
    if (!await getModerationTarget(input.targetType, input.targetId)) throw new ApiError(404, "The reported content is no longer available");
    const [duplicate] = await getDb().select({ id: reports.id }).from(reports).where(and(eq(reports.reporterId, member.id), eq(reports.targetType, input.targetType), eq(reports.targetId, input.targetId), eq(reports.reason, input.reason), inArray(reports.status, ["open", "investigating"]))).limit(1);
    if (duplicate) throw new ApiError(409, "You already have an open report for this content and reason");
    const urgent = ["exploitation", "sexual_content", "self_harm", "credible_threat"].includes(input.reason);
    const high = ["harassment", "fraud", "impersonation", "unsafe_project", "privacy"].includes(input.reason);
    const priority = urgent ? "urgent" : high ? "high" : input.reason === "spam" ? "low" : "normal";
    const targetMs = priority === "urgent" ? 15 * 60_000 : priority === "high" ? 4 * 3_600_000 : priority === "normal" ? 24 * 3_600_000 : 3 * 86_400_000;
    const [report] = await getDb().insert(reports).values({ ...input, priority, responseDueAt: new Date(Date.now() + targetMs), reporterId: member.id }).returning({ id: reports.id, status: reports.status });
    await audit(member.id, "report.created", input.targetType, input.targetId, { reportId: report.id, reason: input.reason, priority });
    return NextResponse.json(report, { status: 201 });
  } catch (error) { return apiError(error); }
}
