import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireMember } from "@/lib/api";
import { trackProductEvent } from "@/lib/analytics";

const schema = z.object({ event: z.literal("profile_opened"), targetId: z.uuid() });

export async function POST(request: Request) {
  try {
    const member = await requireMember(), input = schema.parse(await request.json());
    await trackProductEvent({ actorId: member.id, event: "network_profile_opened", entityType: "user", entityId: input.targetId, properties: { source: "network" } });
    return NextResponse.json({ tracked: true });
  } catch (error) { return apiError(error); }
}
