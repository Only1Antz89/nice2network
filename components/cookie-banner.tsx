"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export const COOKIE_PREFERENCE_KEY = "n2-cookie-preferences";
export const COOKIE_PREFERENCE_EVENT = "n2-cookie-preferences-changed";
export type CookiePreference = { analytics: boolean; decidedAt: string };

export function readCookiePreference(): CookiePreference | null {
  try {
    const value = window.localStorage.getItem(COOKIE_PREFERENCE_KEY);
    return value ? JSON.parse(value) as CookiePreference : null;
  } catch { return null; }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(!readCookiePreference()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function choose(analytics: boolean) {
    const preference = { analytics, decidedAt: new Date().toISOString() };
    window.localStorage.setItem(COOKIE_PREFERENCE_KEY, JSON.stringify(preference));
    window.dispatchEvent(new CustomEvent(COOKIE_PREFERENCE_EVENT, { detail: preference }));
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <section className="cookie-banner" role="dialog" aria-modal="false" aria-label="Cookie choices">
      <div className="cookie-mark" aria-hidden="true">n2</div>
      <div><strong>A small note about cookies.</strong><p>We use essential storage to remember your choices. With your permission, anonymous analytics help us improve the network. <Link href="/privacy#cookies">Read the cookie notice</Link>.</p></div>
      <div className="cookie-actions"><button type="button" className="cookie-essential" onClick={() => choose(false)}>Essential only</button><button type="button" className="cookie-accept" onClick={() => choose(true)}>Allow analytics</button></div>
    </section>
  );
}
