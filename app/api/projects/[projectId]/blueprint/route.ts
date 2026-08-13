import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { projectBlueprints } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { requireProjectOwner } from "@/lib/project-access";
import { generateProjectBlueprint } from "@/lib/recommendations/service";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params;
    await requireProjectOwner(member.id, projectId);
    const [blueprint] = await getDb().select().from(projectBlueprints).where(eq(projectBlueprints.projectId, projectId)).orderBy(desc(projectBlueprints.version)).limit(1);
    return NextResponse.json({ blueprint: blueprint ?? null });
  } catch (error) { return apiError(error); }
}

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const member = await requireMember(), { projectId } = await params;
    await requireProjectOwner(member.id, projectId);
    const blueprint = await generateProjectBlueprint(projectId, member.id);
    await audit(member.id, "project.blueprint_generated", "project", projectId, { blueprintId: blueprint.id, provider: blueprint.provider, usedFallback: blueprint.usedFallback });
    return NextResponse.json({ blueprint }, { status: 201 });
  } catch (error) { return apiError(error); }
}
