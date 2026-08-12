"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, Check, Mail, Upload } from "lucide-react";

export default function SignInPage() {
  const [mode,setMode]=useState<"signin"|"register"|"check-email">("signin");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [photo,setPhoto]=useState("");
  const [pendingEmail,setPendingEmail]=useState("");

  async function choosePhoto(file?:File){if(!file)return;if(file.size>500_000){setError("Choose a photo smaller than 500 KB.");return}const reader=new FileReader();reader.onload=()=>setPhoto(String(reader.result));reader.readAsDataURL(file)}
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");const data=new FormData(event.currentTarget);const email=String(data.get("email"));const password=String(data.get("password"));
    if(mode==="register"){
      if(!photo){setError("Add a profile photo to continue.");setBusy(false);return}
      const response=await fetch("/api/auth/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:data.get("title"),firstName:data.get("firstName"),lastName:data.get("lastName"),age:data.get("age"),image:photo,email,password})});
      const result=await response.json();
      if(!response.ok){setError(result.error);setBusy(false);return}
      setPendingEmail(email);setMode("check-email");setBusy(false);return;
    }
    const result=await signIn("credentials",{email,password,redirect:false});
    if(result?.error){setError("Check your email and password, and make sure verification is complete.");setBusy(false)}else window.location.href="/";
  }

  return <main className="auth-page auth-shell"><section className="auth-story"><Link className="auth-logo light" href="/"><span>n2</span>nice 2 network</Link><div><span className="eyebrow">USEFUL PEOPLE, BROUGHT TOGETHER</span><h1>Start with what you know.<br/>Grow through who you meet.</h1><p>Build a profile around your real experience, then let n2 introduce the projects and people where you can make a difference.</p><div className="auth-proof"><span><Check size={14}/> Your expertise shapes every match</span><span><Check size={14}/> Small rooms, practical projects</span><span><Check size={14}/> You control your visibility</span></div></div><small>© 2026 nice 2 network</small></section><section className="auth-side"><Link className="mobile-auth-logo" href="/"><span>n2</span>nice 2 network</Link>
    {mode==="check-email"?<div className="auth-card verification-card"><span className="verification-icon"><Mail size={23}/></span><span className="eyebrow">CHECK YOUR INBOX</span><h1>Verify your email.</h1><p>We sent a secure link to <strong>{pendingEmail}</strong>. Use it within 60 minutes to add your profession, skills, interests and location.</p><div className="verification-path"><span className="done">1</span><i/><span>2</span><i/><span>3</span></div><small>Account created</small><small>Email verification</small><small>Build your network</small><button className="secondary-button" onClick={()=>setMode("signin")}>Back to sign in</button></div>:
    <section className={`auth-card ${mode==="register"?"register-card":""}`}><span className="eyebrow">{mode==="signin"?"WELCOME BACK":"CREATE YOUR ACCOUNT"}</span><h1>{mode==="signin"?"Good people are waiting.":"First, the essentials."}</h1><p>{mode==="signin"?"Sign in to see the projects and people relevant to you.":"A short registration now. Your professional profile comes after email verification."}</p>{mode==="signin"&&<><div className="oauth-buttons"><button onClick={()=>signIn("google",{redirectTo:"/"})}>Continue with Google</button><button onClick={()=>signIn("microsoft-entra-id",{redirectTo:"/"})}>Continue with Microsoft</button></div><div className="or"><span/>or use email<span/></div></>}<form onSubmit={submit}>{mode==="register"&&<><div className="signup-grid"><label>Title<select name="title" defaultValue="Ms" required><option>Mr</option><option>Ms</option><option>Mrs</option><option>Miss</option><option>Mx</option><option>Dr</option><option>Prof</option></select></label><label>Age<input name="age" type="number" min="18" max="120" required/></label><label>First name<input name="firstName" autoComplete="given-name" required minLength={2}/></label><label>Surname<input name="lastName" autoComplete="family-name" required minLength={2}/></label></div><label className="photo-field">Profile photo<span className="photo-picker">{photo?<img src={photo} alt="Profile preview"/>:<span><Upload size={18}/></span>}<span><strong>{photo?"Photo ready":"Choose a photo"}</strong><small>JPG, PNG or WebP · up to 500 KB</small></span><input aria-label="Profile photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>choosePhoto(e.target.files?.[0])}/></span></label></>}<label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete={mode==="signin"?"current-password":"new-password"} required minLength={10}/><small>At least 10 characters.</small></label>{error&&<p className="form-error">{error}</p>}<button className="primary-button wide" disabled={busy}>{busy?"One moment…":mode==="signin"?"Sign in":<>Create account <ArrowRight size={16}/></>}</button></form><button className="auth-switch" onClick={()=>{setError("");setMode(mode==="signin"?"register":"signin")}}>{mode==="signin"?"New here? Create an account":"Already a member? Sign in"}</button></section>}
  </section></main>;
}
