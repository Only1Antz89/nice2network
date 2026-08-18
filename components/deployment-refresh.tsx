"use client";

import { useEffect, useRef } from "react";
import { DEPLOYMENT_NAVIGATION_EVENT } from "@/lib/deployment-navigation";

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
        !navigator.onLine
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

    const refreshAtNavigationBoundary = () => void checkForUpdate();
    window.addEventListener(DEPLOYMENT_NAVIGATION_EVENT, refreshAtNavigationBoundary);

    return () => {
      window.removeEventListener(DEPLOYMENT_NAVIGATION_EVENT, refreshAtNavigationBoundary);
    };
  }, [initialVersion]);

  return null;
}
