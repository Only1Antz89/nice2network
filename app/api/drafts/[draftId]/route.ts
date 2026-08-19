import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { contentDrafts, projects } from "@/db/schema";
import { ApiError, apiError, requireMember } from "@/lib/api";
import { draftPayloadSchemas, draftSummary, type DraftKind } from "@/lib/content-drafts";

async function ownedDraft(draftId: string, ownerId: string) {
  const [draft] = await getDb().select().from(contentDrafts).where(and(eq(contentDrafts.id, draftId), eq(contentDrafts.ownerId, ownerId))).limit(1);
  if (!draft) throw new ApiError(404, "Draft not found");
  return draft;
}

export async function GET(_: Request, { params }: { params: Promise<{ draftId: string }> }) {
  try {
    const member = await requireMember(), { draftId } = await params;
    return NextResponse.json({ draft: await ownedDraft(draftId, member.id) });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ draftId: string }> }) {
  try {
    const member = await requireMember(), { draftId } = await params, current = await ownedDraft(draftId, member.id), input = z.object({ payload: z.unknown() }).parse(await request.json());
    const kind = current.kind as DraftKind, payload = draftPayloadSchemas[kind].parse(input.payload), projectId = kind === "project" ? (payload as ReturnType<typeof draftPayloadSchemas.project.parse>).projectId : null;
    if (projectId) {
      const [project] = await getDb().select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, member.id), eq(projects.status, "draft"))).limit(1);
      if (!project) throw new ApiError(409, "Linked project draft is unavailable");
    }
    const summary = draftSummary(kind, payload), [draft] = await getDb().update(contentDrafts).set({ payload, projectId, ...summary, updatedAt: new Date() }).where(and(eq(contentDrafts.id, draftId), eq(contentDrafts.ownerId, member.id))).returning();
    return NextResponse.json({ draft });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ draftId: string }> }) {
  try {
    const member = await requireMember(), { draftId } = await params, draft = await ownedDraft(draftId, member.id), db = getDb();
    await db.transaction(async tx => {
      if (draft.kind === "project" && draft.projectId) {
        const deleted = await tx.delete(projects).where(and(eq(projects.id, draft.projectId), eq(projects.ownerId, member.id), eq(projects.status, "draft"))).returning({ id: projects.id });
        if (!deleted.length) await tx.delete(contentDrafts).where(and(eq(contentDrafts.id, draftId), eq(contentDrafts.ownerId, member.id)));
      } else await tx.delete(contentDrafts).where(and(eq(contentDrafts.id, draftId), eq(contentDrafts.ownerId, member.id)));
    });
    return NextResponse.json({ deleted: true });
  } catch (error) { return apiError(error); }
}
