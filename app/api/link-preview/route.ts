import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/api";
import { enforceRateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
const MAX_HTML_BYTES = 512_000;

function isPrivateAddress(address: string) {
  const normalized = address.replace(/^::ffff:/, "").toLowerCase();
  if (["::", "::1", "0.0.0.0", "255.255.255.255"].includes(normalized)) return true;
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19));
  }
  return /^(fc|fd|fe8|fe9|fea|feb)/i.test(normalized) || normalized.startsWith("ff");
}

async function safeTarget(value: string) {
  const url = new URL(value);
  if (!/^(https?):$/.test(url.protocol) || url.username || url.password) throw new Error("Unsupported URL");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) throw new Error("Private URL");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("Private URL");
  return { url, ...addresses[0] };
}

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
  const target = await safeTarget(value);
  return new Promise<{ status: number; location?: string; contentType: string; html: string }>((resolve, reject) => {
    const send = target.url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = send(target.url, {
      headers: { accept: "text/html,application/xhtml+xml", "user-agent": "nice2network-link-preview/1.0" },
      lookup: (_hostname, _options, callback) => callback(null, target.address, target.family),
    }, (response) => {
      const status = response.statusCode ?? 500;
      const location = response.headers.location;
      const contentType = response.headers["content-type"] ?? "";
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_HTML_BYTES) response.destroy(new Error("Preview too large"));
        else chunks.push(chunk);
      });
      response.on("end", () => resolve({ status, location, contentType, html: Buffer.concat(chunks).toString("utf8") }));
      response.on("error", reject);
    });
    req.setTimeout(5_000, () => req.destroy(new Error("Preview timed out")));
    req.on("error", reject);
    req.end();
  });
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
    const initial = (await safeTarget(raw)).url;
    const { html, current } = await fetchPage(initial);
    const title = meta(html, ["og:title", "twitter:title"]) || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "") || current.hostname;
    const description = meta(html, ["og:description", "twitter:description", "description"]);
    const imageValue = meta(html, ["og:image", "twitter:image"]);
    let image: string | null = null;
    if (imageValue) { try { image = (await safeTarget(new URL(imageValue, current).toString())).url.toString(); } catch { image = null; } }
    return NextResponse.json({ url: current.toString(), title: title.slice(0, 180), description: description.slice(0, 320), image, siteName: meta(html, ["og:site_name"]).slice(0, 80), domain: current.hostname.replace(/^www\./, "") }, { headers: { "cache-control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json({ error: "Preview unavailable" }, { status: 422 });
  }
}
