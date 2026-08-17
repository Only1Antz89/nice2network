import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/api";
import { enforceRateLimit, requestIp } from "@/lib/rate-limit";
import { requestRemoteResource, safeRemoteTarget } from "@/lib/safe-remote-http";

export const runtime = "nodejs";
const MAX_IMAGE_BYTES = 2_000_000;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

async function fetchImage(initial: URL) {
  let current = initial;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await requestRemoteResource(current.toString(), {
      accept: "image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.8",
      maxBytes: MAX_IMAGE_BYTES,
      timeoutMs: 7_000,
    });
    if (response.status >= 300 && response.status < 400) {
      if (!response.location) throw new Error("Invalid image redirect");
      current = (await safeRemoteTarget(new URL(response.location, current).toString())).url;
      continue;
    }
    const contentType = response.contentType.split(";", 1)[0].toLowerCase();
    if (response.status < 200 || response.status >= 300 || !ALLOWED_IMAGE_TYPES.has(contentType) || !response.body.length) throw new Error("Preview image unavailable");
    return { body: response.body, contentType };
  }
  throw new Error("Too many image redirects");
}

export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    enforceRateLimit(`link-preview-image:${member.id}:${requestIp(request)}`, 120, 10 * 60_000);
    const raw = request.nextUrl.searchParams.get("url") ?? "";
    if (!raw || raw.length > 2_048) throw new Error("Invalid image URL");
    const initial = (await safeRemoteTarget(raw)).url;
    const image = await fetchImage(initial);
    return new NextResponse(new Uint8Array(image.body), {
      headers: {
        "cache-control": "private, max-age=86400, stale-while-revalidate=604800",
        "content-type": image.contentType,
        "content-length": String(image.body.length),
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404, headers: { "cache-control": "private, no-store" } });
  }
}
