"use client";

import { useState } from "react";
import { Check, Clock3, LogIn, MessageCircle, UserPlus } from "lucide-react";
import GuestAuthPrompt from "@/components/guest-auth-prompt";

export default function PublicProfileAction({
  kind = "reply",
  label,
  authenticatedHref = "/",
  targetId,
}: {
  kind?: "signin" | "follow" | "request" | "reply";
  label?: string;
  authenticatedHref?: string;
  targetId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"" | "pending" | "accepted">("");
  const [error, setError] = useState("");
  const Icon = requestStatus === "accepted" ? Check : requestStatus === "pending" ? Clock3 : kind === "follow" || kind === "request" ? UserPlus : kind === "signin" ? LogIn : MessageCircle;
  const copy = requestStatus === "accepted" ? "Following" : requestStatus === "pending" ? "Request sent" : label ?? (kind === "request" ? "Request to follow" : kind === "follow" ? "Follow" : kind === "signin" ? "Sign in" : "Reply");

  async function act() {
    setChecking(true);
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const session = response.ok ? await response.json() : null;
      if (session?.user?.id) {
        if (kind === "request" && targetId) {
          const request = await fetch(`/api/users/${encodeURIComponent(targetId)}/follow-request`, { method: "POST" });
          const body = await request.json().catch(() => ({}));
          if (!request.ok) throw new Error(body.error ?? "Could not send this follow request");
          setRequestStatus(body.status === "accepted" ? "accepted" : "pending");
          setChecking(false);
          return;
        }
        window.location.href = authenticatedHref;
        return;
      }
    } catch (cause) {
      if (cause instanceof Error && cause.message !== "Failed to fetch") {
        setError(cause.message);
        setChecking(false);
        return;
      }
    }
    setChecking(false);
    setOpen(true);
  }

  return (
    <>
      <button type="button" className={`public-profile-action ${kind}`} onClick={act} disabled={checking || Boolean(requestStatus)}>
        <Icon size={15} aria-hidden="true" /> {checking ? "One moment…" : copy}
      </button>
      {error && <span className="public-profile-action-error" role="alert">{error}</span>}
      {open && <GuestAuthPrompt initialMode="signin" onClose={() => setOpen(false)} />}
    </>
  );
}
