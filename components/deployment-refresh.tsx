"use client";

import { useEffect, useRef } from "react";

const VERSION_CHECK_INTERVAL = 60_000;

export default function DeploymentRefresh({
  initialVersion,
}: {
  initialVersion: string;
}) {
  const checking = useRef(false);
  const reloading = useRef(false);

  useEffect(() => {
    async function checkForUpdate() {
      if (
        checking.current ||
        reloading.current ||
        !navigator.onLine ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      checking.current = true;
      try {
        const response = await fetch(`/api/version?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const result = (await response.json()) as { version?: string };
        if (result.version && result.version !== initialVersion) {
          reloading.current = true;
          window.location.reload();
        }
      } catch {
        // A transient version-check failure should never interrupt the app.
      } finally {
        checking.current = false;
      }
    }

    const resume = () => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };
    const timer = window.setInterval(checkForUpdate, VERSION_CHECK_INTERVAL);
    window.addEventListener("focus", checkForUpdate);
    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", resume);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkForUpdate);
      window.removeEventListener("online", checkForUpdate);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [initialVersion]);

  return null;
}
