import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { requirePermission } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { createEmbeddingReindexJob, processEmbeddingReindex } from "@/lib/recommendations/service";

const schema = z.object({ jobId: z.uuid().optional(), batchSize: z.number().int().min(1).max(50).default(20), reason: z.string().trim().min(10).max(500) });
export async function POST(request: Request) {
  try {
    const admin = await requirePermission("system.manage"), input = schema.parse(await request.json());
    const created = input.jobId ? null : await createEmbeddingReindexJob(admin.user.id);
    const job = await processEmbeddingReindex(input.jobId ?? created!.id, input.batchSize);
    await audit(admin.user.id, "recommendation.reindex_processed", "recommendation_job", job?.id, { processed: job?.processed }, { permission: "system.manage", reason: input.reason });
    return NextResponse.json({ job });
  } catch (error) { return apiError(error); }
}
