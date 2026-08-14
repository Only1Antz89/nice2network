import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_HTML_BYTES = 512_000;

function isPrivateAddress(address: string) {
  const normalized = address.replace(/^::ffff:/, "");
  if (normalized === "::1" || normalized === "0.0.0.0") return true;
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  return /^(fc|fd|fe8|fe9|fea|feb)/i.test(normalized);
}

async function safeUrl(value: string) {
  const url = new URL(value);
  if (!/^(https?):$/.test(url.protocol)) throw new Error("Unsupported URL");
  if (
    url.hostname === "localhost" ||
    url.hostname.endsWith(".local") ||
    url.hostname.endsWith(".internal")
  )
    throw new Error("Private URL");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address)))
    throw new Error("Private URL");
  return url;
}

function decode(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function meta(html: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decode(match[1].trim());
    }
  }
  return "";
}

async function fetchPage(initial: URL) {
  let current = initial;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    current = await safeUrl(current.toString());
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "nice2network-link-preview/1.0",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Invalid redirect");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error("Preview unavailable");
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) throw new Error("Not HTML");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty response");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      chunks.push(value);
    }
    await reader.cancel().catch(() => undefined);
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    return { html, current };
  }
  throw new Error("Too many redirects");
}

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("url") ?? "";
    const initial = await safeUrl(raw);
    const { html, current } = await fetchPage(initial);
    const title =
      meta(html, ["og:title", "twitter:title"]) ||
      decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "") ||
      current.hostname;
    const description = meta(html, [
      "og:description",
      "twitter:description",
      "description",
    ]);
    const imageValue = meta(html, ["og:image", "twitter:image"]);
    let image: string | null = null;
    if (imageValue) {
      try {
        image = (await safeUrl(new URL(imageValue, current).toString())).toString();
      } catch {
        image = null;
      }
    }
    return NextResponse.json(
      {
        url: current.toString(),
        title: title.slice(0, 180),
        description: description.slice(0, 320),
        image,
        siteName: meta(html, ["og:site_name"]).slice(0, 80),
        domain: current.hostname.replace(/^www\./, ""),
      },
      { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch {
    return NextResponse.json({ error: "Preview unavailable" }, { status: 422 });
  }
}
