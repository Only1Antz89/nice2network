import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";
import { blueprintRoleSchema, rolePhaseSchema } from "@/lib/recommendations/blueprint-schema";
import { previewSimilarProjects } from "@/lib/recommendations/project-similarity";

const schema = z.object({
  projectId: z.uuid(),
  roles: z.array(blueprintRoleSchema).min(1).max(18),
  milestones: z.array(z.object({ title: z.string().trim().min(3).max(160), phase: rolePhaseSchema })).min(1).max(15),
});

export async function POST(request: Request) {
  try {
    const member = await requireMember(), input = schema.parse(await request.json());
    const result = await previewSimilarProjects({ ...input, userId: member.id });
    if (result.suggestions.length) await trackProductEvent({
      actorId: member.id,
      event: "similar_project_check_shown",
      entityType: "project",
      entityId: input.projectId,
      properties: { result: result.suggestions.length, source: "pre_publish" },
    });
    return NextResponse.json(result);
  } catch (error) { return apiError(error); }
}
