import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/api";
import { enforceRateLimit, requestIp } from "@/lib/rate-limit";
import { requestRemoteResource, safeRemoteTarget } from "@/lib/safe-remote-http";

export const runtime = "nodejs";
const MAX_HTML_BYTES = 512_000;

function decode(value: string) {
  return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

function meta(html: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
    ];
    for (const pattern of patterns) { const match = html.match(pattern); if (match?.[1]) return decode(match[1].trim()); }
  }
  return "";
}

async function requestPage(value: string) {
  const response = await requestRemoteResource(value, { accept: "text/html,application/xhtml+xml", maxBytes: MAX_HTML_BYTES });
  return { ...response, html: response.body.toString("utf8") };
}

async function fetchPage(initial: URL) {
  let current = initial;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await requestPage(current.toString());
    if (response.status >= 300 && response.status < 400) {
      if (!response.location) throw new Error("Invalid redirect");
      current = new URL(response.location, current);
      continue;
    }
    if (response.status < 200 || response.status >= 300 || !response.contentType.includes("text/html")) throw new Error("Preview unavailable");
    return { html: response.html, current };
  }
  throw new Error("Too many redirects");
}

export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    enforceRateLimit(`link-preview:${member.id}:${requestIp(request)}`, 60, 10 * 60_000);
    const raw = request.nextUrl.searchParams.get("url") ?? "";
    const initial = (await safeRemoteTarget(raw)).url;
    const { html, current } = await fetchPage(initial);
    const title = meta(html, ["og:title", "twitter:title"]) || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "") || current.hostname;
    const description = meta(html, ["og:description", "twitter:description", "description"]);
    const imageValue = meta(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]);
    let image: string | null = null;
    if (imageValue) {
      try {
        const remoteImage = (await safeRemoteTarget(new URL(imageValue, current).toString())).url.toString();
        image = `/api/link-preview/image?url=${encodeURIComponent(remoteImage)}`;
      } catch { image = null; }
    }
    return NextResponse.json({ url: current.toString(), title: title.slice(0, 180), description: description.slice(0, 320), image, imageAlt: meta(html, ["og:image:alt", "twitter:image:alt"]).slice(0, 180), siteName: meta(html, ["og:site_name"]).slice(0, 80), domain: current.hostname.replace(/^www\./, "") }, { headers: { "cache-control": "private, max-age=3600" } });
  } catch {
    return new NextResponse(null, { status: 204, headers: { "cache-control": "private, no-store" } });
  }
}
