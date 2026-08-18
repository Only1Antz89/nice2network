import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const MAX_API_BODY_BYTES = 5 * 1024 * 1024;

export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next();

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_API_BODY_BYTES) return NextResponse.json({ error: "Request body is too large" }, { status: 413 });

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });

  const origin = request.headers.get("origin");
  if (request.nextUrl.pathname.startsWith("/api/admin/") && !origin) return NextResponse.json({ error: "Request origin required" }, { status: 403 });
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : request.nextUrl.origin);
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(configured).origin) return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    } catch {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
