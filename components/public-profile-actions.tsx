"use client";

import { useState } from "react";
import { LogIn, MessageCircle, UserPlus } from "lucide-react";
import GuestAuthPrompt from "@/components/guest-auth-prompt";

export default function PublicProfileAction({
  kind = "reply",
  label,
  authenticatedHref = "/",
}: {
  kind?: "signin" | "follow" | "reply";
  label?: string;
  authenticatedHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const Icon = kind === "follow" ? UserPlus : kind === "signin" ? LogIn : MessageCircle;
  const copy = label ?? (kind === "follow" ? "Follow" : kind === "signin" ? "Sign in" : "Reply");

  async function act() {
    setChecking(true);
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const session = response.ok ? await response.json() : null;
      if (session?.user?.id) {
        window.location.href = authenticatedHref;
        return;
      }
    } catch {
      // A guest can still authenticate when session discovery is unavailable.
    }
    setChecking(false);
    setOpen(true);
  }

  return (
    <>
      <button type="button" className={`public-profile-action ${kind}`} onClick={act} disabled={checking}>
        <Icon size={15} aria-hidden="true" /> {checking ? "One moment…" : copy}
      </button>
      {open && <GuestAuthPrompt initialMode="signin" onClose={() => setOpen(false)} />}
    </>
  );
}
