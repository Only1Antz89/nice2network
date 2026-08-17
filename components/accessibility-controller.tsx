"use client";

import { useEffect, useRef } from "react";
import {
  ACCESSIBILITY_EVENT,
  ACCESSIBILITY_STORAGE_KEY,
  applyAccessibilityPreferences,
  applyAccessibilityPreferencesToMedia,
  normaliseAccessibilityPreferences,
  storeAndApplyAccessibilityPreferences,
  type AccessibilityPreferences,
} from "@/lib/accessibility-preferences";

export default function AccessibilityController() {
  const announcer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let local: AccessibilityPreferences;
    try {
      local = normaliseAccessibilityPreferences(JSON.parse(localStorage.getItem(ACCESSIBILITY_STORAGE_KEY) ?? "null"));
    } catch {
      local = normaliseAccessibilityPreferences(null);
    }
    applyAccessibilityPreferences(local);

    const onChange = (event: Event) => {
      local = normaliseAccessibilityPreferences((event as CustomEvent).detail);
      applyAccessibilityPreferences(local);
    };
    const colourScheme = matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      if (document.documentElement.dataset.colourTheme === "system") applyAccessibilityPreferences(local);
    };
    window.addEventListener(ACCESSIBILITY_EVENT, onChange);
    colourScheme.addEventListener("change", onSystemThemeChange);
    const mediaObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) applyAccessibilityPreferencesToMedia(node);
        }
      }
    });
    mediaObserver.observe(document.body, { childList: true, subtree: true });
    let announcedHeading = "";
    const headingObserver = new MutationObserver(() => {
      const heading = document.querySelector<HTMLElement>("main h1");
      const text = heading?.textContent?.trim() ?? "";
      if (text && text !== announcedHeading && announcer.current) {
        announcedHeading = text;
        announcer.current.textContent = `${text} view`;
      }
    });
    headingObserver.observe(document.body, { childList: true, subtree: true, characterData: true });

    fetch("/api/accessibility")
      .then(async (response) => ({
        remote: response.ok ? await response.json() : null,
        persistence: response.headers.get("x-n2-accessibility-persistence"),
      }))
      .then(({ remote, persistence }) => {
        if (!remote || persistence === "local") return;
        local = normaliseAccessibilityPreferences(remote);
        storeAndApplyAccessibilityPreferences(local);
      })
      .catch(() => undefined);

    return () => {
      window.removeEventListener(ACCESSIBILITY_EVENT, onChange);
      colourScheme.removeEventListener("change", onSystemThemeChange);
      mediaObserver.disconnect();
      headingObserver.disconnect();
    };
  }, []);

  return <div ref={announcer} className="visually-hidden" aria-live="polite" aria-atomic="true" />;
}
