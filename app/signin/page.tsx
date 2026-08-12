"use client";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignInPage() {
  const [mode,setMode]=useState<"signin"|"register">("signin");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError("");const data=new FormData(event.currentTarget);const email=String(data.get("email"));const password=String(data.get("password"));if(mode==="register"){const response=await fetch("/api/auth/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:data.get("name"),email,password})});if(!response.ok){setError((await response.json()).error);setBusy(false);return;}}const result=await signIn("credentials",{email,password,redirect:false});if(result?.error){setError("Check your email and password.");setBusy(false)}else window.location.href="/"}
  return <main className="auth-page"><Link className="auth-logo" href="/"><span>n2</span>nice 2 network</Link><section className="auth-card"><span className="eyebrow">{mode==="signin"?"WELCOME BACK":"JOIN THE NETWORK"}</span><h1>{mode==="signin"?"Good people are waiting.":"Bring what you know."}</h1><p>{mode==="signin"?"Sign in to see the projects and people relevant to you.":"Create a profile around your skills, industry and interests."}</p><div className="oauth-buttons"><button onClick={()=>signIn("google",{redirectTo:"/"})}>Continue with Google</button><button onClick={()=>signIn("microsoft-entra-id",{redirectTo:"/"})}>Continue with Microsoft</button></div><div className="or"><span/>or<span/></div><form onSubmit={submit}>{mode==="register"&&<label>Name<input name="name" required minLength={2}/></label>}<label>Email<input name="email" type="email" required/></label><label>Password<input name="password" type="password" required minLength={10}/></label>{error&&<p className="form-error">{error}</p>}<button className="primary-button wide" disabled={busy}>{busy?"One moment…":mode==="signin"?"Sign in":"Create account"}</button></form><button className="auth-switch" onClick={()=>setMode(mode==="signin"?"register":"signin")}>{mode==="signin"?"New here? Create an account":"Already a member? Sign in"}</button></section></main>;
}
