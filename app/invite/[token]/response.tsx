"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock3, Crown, UserPlus, X } from "lucide-react";

type Invitation = {
  projectId: string;
  projectTitle: string;
  projectSummary: string;
  inviterName: string;
  membershipRole: string;
  roleTitle: string;
  status: string;
  expiresAt: string;
  projectPendingDeletion: boolean;
};

export default function InvitationResponse({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"accepted" | "declined" | "">("");
  const isCoOwnerInvitation = invitation?.membershipRole === "co_owner";

  useEffect(() => {
    fetch(`/api/invitations/${encodeURIComponent(token)}`)
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Unable to open this invitation");
        setInvitation(body);
      })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Unable to open this invitation"));
  }, [token]);

  async function respond(decision: "accepted" | "declined") {
    setBusy(decision);
    setError("");
    const response = await fetch(`/api/invitations/${encodeURIComponent(token)}/respond`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? "Unable to answer this invitation");
      setBusy("");
      return;
    }
    if (decision === "accepted") {
      window.location.href = `/?view=projects&project=${body.projectId}`;
      return;
    }
    setInvitation(current => current ? { ...current, status: "declined" } : current);
    setBusy("");
  }

  return <main className="invitation-response-page">
    <Link className="invitation-brand" href="/"><span>n2</span>nice 2 network</Link>
    <section className="invitation-response-card">
      {error && !invitation ? <><span className="invitation-state-icon"><X/></span><span className="eyebrow">INVITATION UNAVAILABLE</span><h1>We couldn’t open this invitation.</h1><p>{error}</p><Link className="secondary-button" href="/">Return home</Link></> : !invitation ? <><span className="invitation-state-icon"><Clock3/></span><span className="eyebrow">OPENING INVITATION</span><h1>One moment…</h1></> : invitation.status !== "pending" ? <><span className="invitation-state-icon"><Check/></span><span className="eyebrow">INVITATION {invitation.status.toUpperCase()}</span><h1>{invitation.status === "accepted" ? "You’re already on the team." : "This invitation is no longer active."}</h1><p>{invitation.projectTitle}</p><Link className="secondary-button" href={invitation.status === "accepted" ? `/?view=projects&project=${invitation.projectId}` : "/"}>Continue <ArrowRight size={16}/></Link></> : <>
        <span className="invitation-state-icon">{isCoOwnerInvitation ? <Crown/> : <UserPlus/>}</span>
        <span className="eyebrow">{isCoOwnerInvitation ? "PROJECT OWNERSHIP INVITATION" : "PROJECT INVITATION"}</span>
        <h1>{isCoOwnerInvitation ? `Co-own ${invitation.projectTitle}.` : `Join ${invitation.projectTitle}.`}</h1>
        <p><strong>{invitation.inviterName}</strong> invited you to {isCoOwnerInvitation ? "help lead this project as a co-owner" : "join this project"}.</p>
        <div className="invitation-project-brief"><b>{invitation.roleTitle}</b><p>{invitation.projectSummary}</p><small>Expires {new Date(invitation.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</small></div>
        <div className="invitation-permissions"><strong>{isCoOwnerInvitation ? "Accepting gives you project management permissions." : "Accepting adds you to the project team."}</strong><span>{isCoOwnerInvitation ? "You will join Leadership without occupying a recruitment role. The primary owner remains the project’s canonical owner." : "Your invitation keeps its assigned contribution role and does not grant ownership permissions."}</span></div>
        {invitation.projectPendingDeletion && <p className="form-error">This project is pending deletion, so the invitation cannot currently be accepted.</p>}
        {error && <p className="form-error">{error}</p>}
        <footer><button className="secondary-button" disabled={Boolean(busy)} onClick={() => respond("declined")}>{busy === "declined" ? "Declining…" : "Decline"}</button><button className="primary-button" disabled={Boolean(busy) || invitation.projectPendingDeletion} onClick={() => respond("accepted")}>{busy === "accepted" ? "Joining…" : "Accept and join"}</button></footer>
      </>}
    </section>
  </main>;
}
