import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { blueprintRoleSchema } from "@/lib/recommendations/blueprint-schema";
import { approveProjectBlueprint } from "@/lib/recommendations/service";

const schema = z.object({ roles: z.array(blueprintRoleSchema).min(1).max(18), visibility: z.enum(["network", "connections", "private"]).default("network") });

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string; blueprintId: string }> }) {
  try {
    const member = await requireMember(), { projectId, blueprintId } = await params, input = schema.parse(await request.json());
    await approveProjectBlueprint({ projectId, blueprintId, userId: member.id, roles: input.roles, visibility: input.visibility });
    await audit(member.id, "project.blueprint_approved", "project", projectId, { blueprintId, roleCount: input.roles.length });
    return NextResponse.json({ success: true, projectId });
  } catch (error) { return apiError(error); }
}
