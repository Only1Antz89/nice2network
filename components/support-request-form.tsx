"use client";
/* eslint-disable jsx-a11y/label-has-associated-control */

import { FormEvent, useState } from "react";
import { Check, Send } from "lucide-react";
import N2Select from "@/components/n2-select";

const categories = [
  { value: "account_access", label: "Account or sign-in" },
  { value: "profile_privacy", label: "Profile or privacy" },
  { value: "projects", label: "Projects" },
  { value: "safety", label: "Safety concern" },
  { value: "technical", label: "Technical problem" },
  { value: "other", label: "Something else" },
];

export default function SupportRequestForm({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), category: data.get("category"), subject: data.get("subject"), details: data.get("details") }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Your request could not be sent.");
        return;
      }
      form.reset();
      setReference(String(result.id).slice(0, 8).toUpperCase());
    } catch {
      setError("Support is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (reference) return <div className={`support-request-success ${compact ? "compact" : ""}`} role="status"><Check size={21}/><strong>We’ve received your request.</strong><p>Reference {reference}. The n2 team will reply to the email you provided.</p><button type="button" className="secondary-button" onClick={() => setReference("")}>Send another request</button></div>;

  return <form className={`support-request-form ${compact ? "compact" : ""}`} onSubmit={submit}>
    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={320}/></label>
    <label>What do you need help with?<N2Select name="category" ariaLabel="What do you need help with?" defaultValue="account_access" required options={categories}/></label>
    <label>Subject<input name="subject" required minLength={5} maxLength={160} placeholder="A short summary of the issue"/></label>
    <label>Tell us what happened<textarea name="details" required minLength={20} maxLength={2000} placeholder="Include any steps, error message, or account details that will help us investigate."/></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary-button" disabled={busy}><Send size={15}/>{busy ? "Sending…" : "Send to support"}</button>
  </form>;
}
