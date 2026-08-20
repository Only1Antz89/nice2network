"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import PasswordInput from "@/components/password-input";

export default function RecoverAccountPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recovered, setRecovered] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/account/recover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setError(result.error ?? "Your account could not be recovered.");
      else setRecovered(true);
    } catch {
      setError("Recovery is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return <main className="recovery-page">
    <Link className="recovery-logo" href="/"><span>n2</span>nice 2 network</Link>
    <section className="recovery-card">
      {recovered ? <>
        <span className="verification-icon success"><Check size={22}/></span>
        <span className="eyebrow">ACCOUNT RECOVERED</span>
        <h1>Welcome back.</h1>
        <p>Your account is active again. Any completed project ownership transfers and cancelled meets are not automatically reversed.</p>
        <Link className="primary-button wide recovery-signin" href="/signin">Continue to sign in</Link>
      </> : <>
        <span className="eyebrow">ACCOUNT RECOVERY</span>
        <h1>Reactivate your account.</h1>
        <p>Within 30 days of deactivation, enter the email address and password previously attached to your account.</p>
        <form onSubmit={submit}>
          <label>Email address<input type="email" name="email" autoComplete="email" required/></label>
          <label>Previous password<PasswordInput id="recovery-password" name="password" autoComplete="current-password" required/></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button wide" disabled={busy}>{busy ? "Recovering…" : <><RotateCcw size={16}/> Recover account</>}</button>
        </form>
        <Link className="recovery-text-link" href="/signin"><ArrowLeft size={14}/> Back to sign in</Link>
      </>}
    </section>
  </main>;
}
