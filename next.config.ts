import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "i.pravatar.cc" }] },
  async headers() {
    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const shouldUpgradeInsecureRequests =
      process.env.NODE_ENV === "production"
      && (!configuredAppUrl || configuredAppUrl.startsWith("https://"));
    const contentSecurityPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://i.pravatar.cc",
      "media-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://vitals.vercel-insights.com",
      "frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://www.openstreetmap.org",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(shouldUpgradeInsecureRequests ? ["upgrade-insecure-requests"] : []),
    ].join("; ");
    return [{ source: "/:path*", headers: [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
      { key: "Strict-Transport-Security", value: "max-age=31536000" },
    ] }];
  },
};

export default nextConfig;
