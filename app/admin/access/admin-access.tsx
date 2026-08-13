"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type SetupResponse = { secret?: string; otpAuthUrl?: string; error?: string };

export default function AdminAccess({ forcePasswordChange: initialForce, mfaEnrolled: initialMfa, email }: { forcePasswordChange: boolean; mfaEnrolled: boolean; email: string }) {
  const [forcePasswordChange, setForcePasswordChange] = useState(initialForce);
  const [mfaEnrolled, setMfaEnrolled] = useState(initialMfa);
  const [secret, setSecret] = useState("");
  const [otpAuthUrl, setOtpAuthUrl] = useState("");
  const [secretVisible, setSecretVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (forcePasswordChange || mfaEnrolled) return;
    const controller = new AbortController();
    fetch("/api/admin/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "setup" }),
      signal: controller.signal,
    }).then(async response => {
      const result = await response.json() as SetupResponse;
      if (!response.ok) throw new Error(result.error ?? "Authenticator setup could not be prepared.");
      setSecret(result.secret ?? "");
      setOtpAuthUrl(result.otpAuthUrl ?? "");
    }).catch(setupError => {
      if (setupError instanceof DOMException && setupError.name === "AbortError") return;
      setError(setupError instanceof Error ? setupError.message : "Authenticator setup could not be prepared.");
    });
    return () => controller.abort();
  }, [forcePasswordChange, mfaEnrolled]);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    if (form.get("newPassword") !== form.get("confirm")) { setError("New passwords do not match."); setBusy(false); return; }
    const response = await fetch("/api/auth/password/change", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error); setBusy(false); return; }
    setForcePasswordChange(false); setBusy(false);
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const code = new FormData(event.currentTarget).get("code");
    const response = await fetch("/api/admin/access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "verify", code }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error); setBusy(false); return; }
    setMfaEnrolled(true); window.location.href = "/admin";
  }

  async function copySecret() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <main className="admin-access-page"><Link className="admin-access-logo" href="/"><span>n2</span><strong>nice 2 network</strong><i>ADMIN</i></Link><section className="admin-access-card">{forcePasswordChange ? <><span className="access-icon"><KeyRound size={22}/></span><span className="eyebrow">SECURE YOUR ACCOUNT</span><h1>Replace your temporary password.</h1><p>This password was used only to provision the master account. Choose a private password before enabling administrator access.</p><form onSubmit={changePassword}><label>Temporary password<input name="currentPassword" type="password" autoComplete="current-password" required/></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={10} required/></label><label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" minLength={10} required/></label>{error&&<p className="form-error">{error}</p>}<button className="primary-button wide" disabled={busy}>{busy?"Updating…":<>Update password <ArrowRight size={16}/></>}</button></form></> : <><span className="access-icon"><ShieldCheck size={22}/></span><span className="eyebrow">ADMIN VERIFICATION</span><h1>{mfaEnrolled?"Confirm it’s you.":"Add an authenticator."}</h1><p>{mfaEnrolled?"Enter the current six-digit code from your authenticator app.":"Scan this QR code with Google Authenticator, Microsoft Authenticator or another TOTP-compatible app."}</p>{!mfaEnrolled&&<div className="mfa-enrolment">{otpAuthUrl?<div className="mfa-qr"><QRCodeSVG value={otpAuthUrl} size={190} level="M" marginSize={2} title={`Authenticator setup for ${email}`}/><span>Scan with your authenticator app</span></div>:<div className="mfa-qr-loading" aria-live="polite"><span/><p>Preparing secure QR code…</p></div>}<div className="mfa-manual"><button type="button" className="mfa-reveal" onClick={()=>setSecretVisible(value=>!value)} aria-expanded={secretVisible}>{secretVisible?<EyeOff size={15}/>:<Eye size={15}/>} {secretVisible?"Hide setup key":"Can’t scan? Reveal setup key"}</button>{secretVisible&&<div className="mfa-secret"><small>MANUAL SETUP KEY</small><strong>{secret||"Preparing secure key…"}</strong><button type="button" onClick={copySecret} disabled={!secret}>{copied?<Check size={13}/>:<Copy size={13}/>} {copied?"Copied":"Copy"}</button></div>}<small className="mfa-security-note">Treat this key like a password. Anyone with it can generate your administrator codes.</small></div></div>}<form onSubmit={verify}><label>Six-digit code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required/></label>{error&&<p className="form-error">{error}</p>}<button className="primary-button wide" disabled={busy||(!mfaEnrolled&&!otpAuthUrl)}>{busy?"Verifying…":<>{mfaEnrolled?"Enter admin":"Verify and enable MFA"} <Check size={16}/></>}</button></form></>}</section></main>;
}
