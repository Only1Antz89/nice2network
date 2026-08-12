"use client";

import { Analytics } from "@vercel/analytics/next";

export default function SiteAnalytics() {
  return <Analytics beforeSend={(event) => {
    const url = new URL(event.url);
    if (url.pathname.startsWith("/api/auth/") || url.pathname.includes("verify") || url.pathname.includes("reset-password")) return null;
    return { ...event, url: `${url.origin}${url.pathname}` };
  }}/>;
}
