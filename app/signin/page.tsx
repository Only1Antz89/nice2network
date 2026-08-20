"use client";
/* eslint-disable @next/next/no-img-element, jsx-a11y/label-has-associated-control */

import { FormEvent, Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Mail } from "lucide-react";
import PasswordInput from "@/components/password-input";
import N2Select from "@/components/n2-select";

function SignInContent() {
  const searchParams=useSearchParams();
  const [mode,setMode]=useState<"signin"|"register"|"check-email">(searchParams.get("mode")==="register"?"register":"signin");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [photo,setPhoto]=useState("");
  const [pendingEmail,setPendingEmail]=useState("");
  const accountDeleted=searchParams.get("account")==="deleted";
  const accountDeactivated=searchParams.get("account")==="deactivated";

  async function choosePhoto(file?:File){if(!file)return;if(file.size>500_000){setError("Choose a photo smaller than 500 KB.");return}const reader=new FileReader();reader.onload=()=>setPhoto(String(reader.result));reader.readAsDataURL(file)}
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");const data=new FormData(event.currentTarget);const email=String(data.get("email"));const password=String(data.get("password"));
    try {
      if(mode==="register"){
        const response=await fetch("/api/auth/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:data.get("title"),firstName:data.get("firstName"),lastName:data.get("lastName"),dateOfBirth:data.get("dateOfBirth"),image:photo,email,password})});
        const result=await response.json();
        if(!response.ok){setError(result.error);return}
        if(result.onboarding){window.location.href="/onboarding";return}
        setPendingEmail(email);setMode("check-email");return;
      }
      const resumeResponse=await fetch("/api/auth/onboarding/resume",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password})}),resume=await resumeResponse.json().catch(()=>({resume:false}));if(resume.resume){window.location.href="/onboarding?resume=1";return}
      const result=await signIn("credentials",{email,password,redirect:false});
      if(result?.error){setError(result.code==="rate_limit"?"Too many sign-in attempts. Please wait 15 minutes and try again.":"Check your email and password. If registration is unfinished, use the password you created to resume your profile setup.");return}
      const session=await fetch("/api/auth/session").then(response=>response.json()).catch(()=>null);if(session?.user?.forcePasswordChange){window.location.href="/change-password";return}const next=new URLSearchParams(window.location.search).get("next");window.location.href=next?.startsWith("/")?next:"/";
    } catch {
      setError("Sign in is temporarily unavailable. Please refresh the page and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page auth-shell">
    <section className="auth-story">
      <Link className="auth-logo light" href="/"><span>n2</span>nice 2 network</Link>
      <div><span className="eyebrow">CONNECT, CREATE AND SUPPORT</span><h1>Bring your ideas.<br/>Find your community.</h1><p>Meet people, start or join projects, share encouragement and help each other turn ideas into action.</p><div className="auth-proof"><span><Check size={14}/> Everyone has something to bring</span><span><Check size={14}/> Create projects or get involved</span><span><Check size={14}/> You control your visibility</span></div></div>
      <small>© 2026 nice 2 network</small>
    </section>
    <section className="auth-side">
      <Link className="mobile-auth-logo" href="/"><span>n2</span>nice 2 network</Link>
      {mode==="check-email"?<div className="auth-card verification-card"><span className="verification-icon"><Mail size={23}/></span><span className="eyebrow">CHECK YOUR INBOX</span><h1>Verify your email.</h1><p>We sent a secure link to <strong>{pendingEmail}</strong>. Use it within 60 minutes to add your profession, skills, interests and location.</p><div className="verification-path"><span className="done">1</span><i/><span>2</span><i/><span>3</span></div><small>Account created</small><small>Email verification</small><small>Build your network</small><button className="secondary-button" onClick={()=>setMode("signin")}>Back to sign in</button></div>:
      <section className={`auth-card ${mode==="register"?"register-card":"signin-card"}`}>
        <span className="eyebrow">{mode==="signin"?"WELCOME BACK":"CREATE YOUR ACCOUNT"}</span>
        <h1>{mode==="signin"?"Welcome back to your community.":"Join the community."}</h1>
        <p>{mode==="signin"?"Sign in to reconnect, join projects, encourage others and keep ideas moving.":"Create your account, share what interests you and discover ways to take part."}</p>
        {accountDeleted&&mode==="signin"&&<p className="form-success" role="status"><Check size={14}/> Your account has been deleted.</p>}
        {accountDeactivated&&mode==="signin"&&<p className="form-success" role="status"><Check size={14}/> Your account is deactivated. You can recover it for 30 days.</p>}
        <form onSubmit={submit}>
          {mode==="register"&&<><div className="signup-grid"><label>Title<N2Select name="title" defaultValue="Ms" required ariaLabel="Title" options={["Mr", "Ms", "Mrs", "Miss", "Mx", "Dr", "Prof"].map(value => ({ value, label: value }))}/></label><label>Date of birth<input name="dateOfBirth" type="date" max={new Date(new Date().setFullYear(new Date().getFullYear()-16)).toISOString().slice(0,10)} required/></label><label>First name<input name="firstName" autoComplete="given-name" required minLength={2}/></label><label>Surname<input name="lastName" autoComplete="family-name" required minLength={2}/></label></div><label className="photo-field">Profile photo <small>Optional — n2 is your default.</small><span className="photo-picker">{photo?<img src={photo} alt="Profile preview"/>:<span className="default-photo-preview">n2</span>}<span><strong>{photo?"Photo ready":"Use n2 or choose a photo"}</strong><small>JPG, PNG or WebP · up to 500 KB</small></span><input aria-label="Profile photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>choosePhoto(event.target.files?.[0])}/></span></label></>}
          <label>Email<input name="email" type="email" autoComplete="email" required/></label>
          <label htmlFor="auth-password">Password{mode==="signin"&&<Link className="forgot-link" href="/forgot-password">Forgot password?</Link>}<PasswordInput id="auth-password" name="password" autoComplete={mode==="signin"?"current-password":"new-password"} required minLength={10}/><small>At least 10 characters.</small></label>
          {error&&<p className="form-error">{error}</p>}
          <button className="primary-button wide" disabled={busy}>{busy?"One moment…":mode==="signin"?"Sign in":<>Create account <ArrowRight size={16}/></>}</button>
        </form>
        <button className="auth-switch" onClick={()=>{setError("");setMode(mode==="signin"?"register":"signin")}}>{mode==="signin"?"New here? Create an account":"Already a member? Sign in"}</button>
        {mode==="signin"&&<Link className="recovery-text-link" href="/recover-account">Recover a deactivated account</Link>}
      </section>}
    </section>
  </main>;
}

export default function SignInPage(){return <Suspense fallback={<main className="auth-page"/>}><SignInContent/></Suspense>}
