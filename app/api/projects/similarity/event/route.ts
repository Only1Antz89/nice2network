import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";

const schema = z.object({
  action: z.enum(["target_viewed", "continued_own_project"]),
  sourceProjectId: z.uuid(),
  targetProjectId: z.uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const member = await requireMember(), input = schema.parse(await request.json());
    const [source] = await getDb().select({ ownerId: projects.ownerId, status: projects.status }).from(projects).where(eq(projects.id, input.sourceProjectId)).limit(1);
    if (!source || source.ownerId !== member.id || source.status !== "draft") throw new ApiError(403, "Only the draft owner can record this choice");
    await trackProductEvent({
      actorId: member.id,
      event: input.action === "target_viewed" ? "similar_project_target_viewed" : "similar_project_owner_continued",
      entityType: "project",
      entityId: input.targetProjectId ?? input.sourceProjectId,
      properties: { source: "pre_publish" },
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
