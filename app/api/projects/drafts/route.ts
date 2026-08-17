import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { projectMembers, projects } from "@/db/schema";
import { apiError, requireMember } from "@/lib/api";
import { audit } from "@/lib/audit";
import { trackProductEvent } from "@/lib/analytics";
import { workModeSchema } from "@/lib/recommendations/blueprint-schema";

const schema = z.object({
  title: z.string().trim().min(4, "Project title must be at least 4 characters.").max(120, "Project title must be 120 characters or fewer."), summary: z.string().trim().min(20, "Project summary must be at least 20 characters.").max(500, "Project summary must be 500 characters or fewer."), description: z.string().trim().max(5000).nullable().optional(),
  industry: z.string().trim().min(2).max(80), stage: z.enum(["idea", "planning", "building", "launching"]).default("idea"),
  workMode: workModeSchema.default("remote"), city: z.string().trim().max(100).nullable().optional(), country: z.string().trim().max(100).nullable().optional(),
  timezone: z.string().trim().min(3).max(80).default("Europe/London"), allowRemoteFallback: z.boolean().default(true), accent: z.string().regex(/^#[0-9a-f]{6}$/i).default("#ff6b35"),
  imageUrl: z.string().max(1_500_000).refine(value=>!value||/^data:image\/(jpeg|png|webp);base64,/i.test(value)).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const member = await requireMember(), parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: issue.message, field: String(issue.path[0] ?? "form") }, { status: 400 });
    }
    const input = parsed.data, db = getDb();
    const project = await db.transaction(async tx => {
      const [created] = await tx.insert(projects).values({ ...input, ownerId: member.id, status: "draft", visibility: "private", location: [input.city, input.country].filter(Boolean).join(", ") || null }).returning();
      await tx.insert(projectMembers).values({ projectId: created.id, userId: member.id, membershipRole: "owner", department: "Leadership" });
      return created;
    });
    await audit(member.id, "project.draft_created", "project", project.id);
    await trackProductEvent({ actorId: member.id, event: "project_draft_created", entityType: "project", entityId: project.id, properties: { industry: input.industry, stage: input.stage } });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) { return apiError(error); }
}
