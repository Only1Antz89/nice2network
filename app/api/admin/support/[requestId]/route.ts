import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { supportRequests } from "@/db/schema";
import { requirePermission } from "@/lib/admin";
import { ApiError, apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { sendSupportResolutionEmail } from "@/lib/email";

const schema = z.object({
  action: z.enum(["assign", "resolve", "dismiss"]),
  resolution: z.string().trim().min(10).max(2000).optional(),
  reason: z.string().trim().min(10).max(2000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const admin = await requirePermission("members.support");
    const { requestId } = await params;
    const input = schema.parse(await request.json());
    const db = getDb();
    const resolution = input.resolution ?? input.reason;
    const [ticket] = await db.select().from(supportRequests).where(eq(supportRequests.id, requestId)).limit(1);
    if (!ticket) throw new ApiError(404, "Support request not found");
    if (["resolved", "dismissed"].includes(ticket.status)) throw new ApiError(409, "This support request is already closed");
    if (input.action === "assign") {
      await db.update(supportRequests).set({ assignedTo: admin.user.id, status: "in_progress", updatedAt: new Date() }).where(and(eq(supportRequests.id, requestId), inArray(supportRequests.status, ["open", "in_progress"])));
    } else {
      if (!resolution) throw new ApiError(400, "Enter a resolution of at least 10 characters");
      if (input.action === "resolve") {
        try {
          await sendSupportResolutionEmail({ email: ticket.email, subject: ticket.subject, resolution, requestId });
        } catch {
          throw new ApiError(503, "The resolution email could not be delivered. The request remains open for retry");
        }
      }
      await db.update(supportRequests).set({ assignedTo: admin.user.id, status: input.action === "resolve" ? "resolved" : "dismissed", resolution, resolvedAt: new Date(), updatedAt: new Date() }).where(and(eq(supportRequests.id, requestId), inArray(supportRequests.status, ["open", "in_progress"])));
    }
    await audit(admin.user.id, `admin.support_${input.action}`, "support_request", requestId, {}, { permission: "members.support", reason: resolution, after: { status: input.action === "assign" ? "in_progress" : input.action === "resolve" ? "resolved" : "dismissed" } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
