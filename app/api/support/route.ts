import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { supportRequests } from "@/db/schema";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { enforceDistributedRateLimit } from "@/lib/distributed-rate-limit";
import { enforceRateLimit, requestIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email().max(320).transform(value => value.trim().toLowerCase()),
  category: z.enum(["account_access", "profile_privacy", "projects", "safety", "technical", "other"]),
  subject: z.string().trim().min(5).max(160),
  details: z.string().trim().min(20).max(2000),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const ip = requestIp(request);
    enforceRateLimit(`support:${ip}:${input.email}`, 5, 60 * 60_000);
    await enforceDistributedRateLimit(`support:${ip}:${input.email}`, 5, 60 * 60_000);
    const session = await auth();
    const requesterId = session?.user?.id || null;
    const [supportRequest] = await getDb().insert(supportRequests).values({ ...input, requesterId }).returning({ id: supportRequests.id, status: supportRequests.status });
    await audit(requesterId, "support.request_created", "support_request", supportRequest.id, { category: input.category });
    return NextResponse.json(supportRequest, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
