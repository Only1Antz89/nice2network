"use client";

/* PasswordInput renders the nested input; the static label rule cannot follow the component boundary. */
/* eslint-disable jsx-a11y/label-has-associated-control */

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import PasswordInput from "@/components/password-input";

export default function ChangeTemporaryPassword() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword") ?? "");
    if (newPassword !== String(data.get("confirmPassword") ?? "")) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/password/change", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Your password could not be changed.");
      setBusy(false);
      return;
    }
    window.location.href = "/";
  }

  return <main className="admin-access-page"><Link className="admin-access-logo" href="/"><span>n2</span><strong>nice 2 network</strong></Link><section className="admin-access-card"><span className="access-icon"><KeyRound size={22}/></span><span className="eyebrow">SECURE YOUR ACCOUNT</span><h1>Choose your own password.</h1><p>An n2 administrator gave you temporary access. Replace that password before continuing to your network.</p><form onSubmit={submit}><label>Temporary password<PasswordInput id="temporary-password" name="currentPassword" autoComplete="current-password" required/></label><label>New password<PasswordInput id="replacement-password" name="newPassword" autoComplete="new-password" minLength={10} required/></label><label>Confirm new password<PasswordInput id="confirm-replacement-password" name="confirmPassword" autoComplete="new-password" minLength={10} required/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary-button wide" disabled={busy}>{busy?"Updating…":<>Change password <ArrowRight size={16}/></>}</button></form></section></main>;
}
