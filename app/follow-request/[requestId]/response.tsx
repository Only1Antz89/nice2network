"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Clock3, UserPlus, X } from "lucide-react";
import { Avatar } from "@/components/network-brand";

type FollowRequest = {
  id: string;
  requesterId: string;
  status: string;
  createdAt: string;
  requesterName: string | null;
  requesterUsername: string;
  requesterImage: string | null;
  requesterProfession: string | null;
};

export default function FollowRequestResponse({ requestId }: { requestId: string }) {
  const [request, setRequest] = useState<FollowRequest | null>(null);
  const [canRespond, setCanRespond] = useState(false);
  const [busy, setBusy] = useState<"accepted" | "declined" | "">("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/follow-requests/${encodeURIComponent(requestId)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Unable to open this follow request");
        setRequest(body.request);
        setCanRespond(Boolean(body.canRespond));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to open this follow request"));
  }, [requestId]);

  async function respond(decision: "accepted" | "declined") {
    setBusy(decision);
    setError("");
    const response = await fetch(`/api/follow-requests/${encodeURIComponent(requestId)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? "Unable to answer this follow request");
      setBusy("");
      return;
    }
    setRequest((current) => current ? { ...current, status: decision } : current);
    setBusy("");
  }

  return <main className="invitation-response-page">
    <Link className="invitation-brand" href="/"><span>n2</span>nice 2 network</Link>
    <section className="invitation-response-card">
      {error && !request ? <><span className="invitation-state-icon"><X /></span><span className="eyebrow">REQUEST UNAVAILABLE</span><h1>We couldn’t open this request.</h1><p>{error}</p><Link className="secondary-button" href="/">Return home</Link></> : !request ? <><span className="invitation-state-icon"><Clock3 /></span><span className="eyebrow">OPENING REQUEST</span><h1>One moment…</h1></> : request.status !== "pending" ? <><span className="invitation-state-icon"><Check /></span><span className="eyebrow">REQUEST {request.status.toUpperCase()}</span><h1>{request.status === "accepted" ? "You’re now connected." : "This request is closed."}</h1><p>{request.requesterName ?? `@${request.requesterUsername}`}</p><Link className="secondary-button" href={request.status === "accepted" ? `/?profile=${request.requesterId}` : "/"}>Continue</Link></> : <>
        <span className="invitation-state-icon"><UserPlus /></span>
        <span className="eyebrow">PRIVATE PROFILE REQUEST</span>
        <h1>{canRespond ? "Someone would like to follow you." : "Your follow request is waiting."}</h1>
        <div className="follow-request-person"><Avatar person={{ name: request.requesterName ?? request.requesterUsername, role: request.requesterProfession ?? `@${request.requesterUsername}`, img: request.requesterImage }} size="lg" /><span><strong>{request.requesterName ?? request.requesterUsername}</strong><small>@{request.requesterUsername}{request.requesterProfession ? ` · ${request.requesterProfession}` : ""}</small></span></div>
        <p>{canRespond ? "Accepting lets this member follow you and view the profile information you reserve for your network." : "The profile owner will be notified and can approve or decline your request."}</p>
        {error && <p className="form-error">{error}</p>}
        <footer>{canRespond ? <><button className="secondary-button" disabled={Boolean(busy)} onClick={() => respond("declined")}>{busy === "declined" ? "Declining…" : "Decline"}</button><button className="primary-button" disabled={Boolean(busy)} onClick={() => respond("accepted")}>{busy === "accepted" ? "Accepting…" : "Accept request"}</button></> : <Link className="secondary-button" href="/">Return home</Link>}</footer>
      </>}
    </section>
  </main>;
}
