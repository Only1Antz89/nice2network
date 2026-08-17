"use client";

import { Analytics } from "@vercel/analytics/next";
import { useEffect, useState } from "react";
import { COOKIE_PREFERENCE_EVENT, readCookiePreference, type CookiePreference } from "@/components/cookie-banner";

export default function SiteAnalytics() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setEnabled(Boolean(readCookiePreference()?.analytics)), 0);
    const update = (event: Event) => setEnabled(Boolean((event as CustomEvent<CookiePreference>).detail.analytics));
    window.addEventListener(COOKIE_PREFERENCE_EVENT, update);
    return () => { window.clearTimeout(timer); window.removeEventListener(COOKIE_PREFERENCE_EVENT, update); };
  }, []);
  if (!enabled) return null;
  return <Analytics beforeSend={(event) => {
    const url = new URL(event.url);
    if (url.pathname.startsWith("/api/auth/") || url.pathname.includes("verify") || url.pathname.includes("reset-password")) return null;
    return { ...event, url: `${url.origin}${url.pathname}` };
  }}/>;
}
