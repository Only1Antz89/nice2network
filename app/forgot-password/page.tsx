"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";

export default function ForgotPasswordPage(){
  const [sent,setSent]=useState(false);const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const data=new FormData(event.currentTarget);await fetch("/api/auth/password/forgot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:data.get("email")})});setSent(true);setBusy(false)}
  return <main className="recovery-page"><Link className="recovery-logo" href="/"><span>n2</span>nice 2 network</Link><section className="recovery-card">{sent?<><span className="verification-icon"><Mail size={22}/></span><span className="eyebrow">CHECK YOUR INBOX</span><h1>Look for a reset link.</h1><p>If an account matches that email, we’ve sent a secure link. It will expire in 30 minutes.</p><Link className="secondary-button recovery-back" href="/signin"><ArrowLeft size={15}/> Back to sign in</Link></>:<><span className="eyebrow">PASSWORD HELP</span><h1>Find your way back.</h1><p>Enter the email attached to your account and we’ll send a secure password-reset link.</p><form onSubmit={submit}><label>Email address<input type="email" name="email" autoComplete="email" required/></label><button className="primary-button wide" disabled={busy}>{busy?"Sending…":<>Send reset link <ArrowRight size={16}/></>}</button></form><Link className="recovery-text-link" href="/signin"><ArrowLeft size={14}/> Back to sign in</Link></>}</section></main>;
}
