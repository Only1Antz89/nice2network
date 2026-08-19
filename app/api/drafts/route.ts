import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { contentDrafts, projects } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { draftKindSchema, draftPayloadSchemas, draftSummary, type DraftKind } from "@/lib/content-drafts";

function parsePayload(kind: DraftKind, payload: unknown) {
  return draftPayloadSchemas[kind].parse(payload);
}

async function assertLinkedProject(ownerId: string, kind: DraftKind, payload: ReturnType<typeof parsePayload>) {
  const projectId = kind === "project" ? (payload as ReturnType<typeof draftPayloadSchemas.project.parse>).projectId : null;
  if (!projectId) return null;
  const [project] = await getDb().select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId), eq(projects.status, "draft"))).limit(1);
  if (!project) throw new ApiError(409, "Linked project draft is unavailable");
  return projectId;
}

export async function GET(request: Request) {
  try {
    const member = await requireMember(), kind = draftKindSchema.parse(new URL(request.url).searchParams.get("kind")), db = getDb();
    const drafts = await db.select({ id: contentDrafts.id, kind: contentDrafts.kind, title: contentDrafts.title, preview: contentDrafts.preview, step: contentDrafts.step, projectId: contentDrafts.projectId, createdAt: contentDrafts.createdAt, updatedAt: contentDrafts.updatedAt })
      .from(contentDrafts).where(and(eq(contentDrafts.ownerId, member.id), eq(contentDrafts.kind, kind))).orderBy(desc(contentDrafts.updatedAt));
    return NextResponse.json({ drafts });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(), input = z.object({ kind: draftKindSchema, payload: z.unknown() }).parse(await request.json()), db = getDb();
    const payload = parsePayload(input.kind, input.payload), projectId = await assertLinkedProject(member.id, input.kind, payload), summary = draftSummary(input.kind, payload);
    const [draft] = await db.insert(contentDrafts).values({ ownerId: member.id, kind: input.kind, payload, projectId, ...summary }).returning();
    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) { return apiError(error); }
}
