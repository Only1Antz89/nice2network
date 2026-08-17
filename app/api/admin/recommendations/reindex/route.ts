import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { requirePermission } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { createEmbeddingReindexJob, processEmbeddingReindex } from "@/lib/recommendations/service";
import { createProjectEmbeddingReindexJob, processProjectEmbeddingReindex } from "@/lib/recommendations/project-similarity";

const schema = z.object({ jobId: z.uuid().optional(), batchSize: z.number().int().min(1).max(50).default(20), reason: z.string().trim().min(10).max(500) });
export async function POST(request: Request) {
  try {
    const admin = await requirePermission("system.manage"), input = schema.parse(await request.json());
    const created = input.jobId ? [] : await Promise.all([createEmbeddingReindexJob(admin.user.id), createProjectEmbeddingReindexJob(admin.user.id)]);
    const jobIds = input.jobId ? [input.jobId] : created.map(job => job.id);
    const jobs = [];
    for (const jobId of jobIds) {
      const memberJob = await processEmbeddingReindex(jobId, input.batchSize);
      const projectJob = await processProjectEmbeddingReindex(jobId, input.batchSize);
      jobs.push(projectJob?.type === "project_embedding_reindex" ? projectJob : memberJob);
    }
    await audit(admin.user.id, "recommendation.reindex_processed", "recommendation_job", jobs[0]?.id, { jobIds, processed: jobs.reduce((total, job) => total + Number(job?.processed ?? 0), 0) }, { permission: "system.manage", reason: input.reason });
    return NextResponse.json({ job: jobs[0] ?? null, jobs });
  } catch (error) { return apiError(error); }
}
