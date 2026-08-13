"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, MapPin, Sparkles, UsersRound } from "lucide-react";

type NetworkMember={id:string;name:string|null;image:string|null;profession:string|null;location:string|null;sharedSkills:string[];sharedInterests:string[];score:number};
type ProjectSuggestion={id:string;title:string;summary:string;industry:string;stage:string;accent:string;workMode:string;location:string|null;score:number;reasons:string[]};
type ProfileDraft={profession:string;industry:string;bio:string;primarySkill:string;secondarySkill:string;tertiarySkill:string;interests:string;location:string;workMode:"remote"|"hybrid"|"in_person"};

const slideNames=["About you","Career skills","Interests","People","Projects"];
const initialDraft:ProfileDraft={profession:"",industry:"",bio:"",primarySkill:"",secondarySkill:"",tertiarySkill:"",interests:"",location:"",workMode:"hybrid"};

export default function OnboardingPage(){
  const [step,setStep]=useState(0),[draft,setDraft]=useState(initialDraft),[busy,setBusy]=useState(false),[error,setError]=useState(""),[network,setNetwork]=useState<NetworkMember[]>([]),[projects,setProjects]=useState<ProjectSuggestion[]>([]);
  const update=(field:keyof ProfileDraft,value:string)=>setDraft(current=>({...current,[field]:value}));
  function next(){
    setError("");
    if(step===0&&(!draft.profession.trim()||!draft.industry.trim()||draft.bio.trim().length<10)){setError("Add your profession, industry and a short bio to continue.");return}
    if(step===1&&(!draft.primarySkill.trim()||!draft.secondarySkill.trim()||!draft.tertiarySkill.trim())){setError("Add all three ranked career skills to continue.");return}
    setStep(current=>Math.min(current+1,4));
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");
    const interests=draft.interests.split(",").map(value=>value.trim()).filter(Boolean);
    if(!interests.length||!draft.location.trim()){setError("Add at least one interest and your location to continue.");return}
    setBusy(true);
    const response=await fetch("/api/auth/onboarding",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...draft,interests})});
    const result=await response.json();
    if(!response.ok){setError(result.error??"Could not complete your profile.");setBusy(false);return}
    setNetwork(Array.isArray(result.network)?result.network:[]);
    setProjects(Array.isArray(result.projects)?result.projects:[]);
    setStep(3);setBusy(false);
  }
  return <main className="onboarding-page onboarding-flow"><div className="onboarding-backdrop"/><section className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
    <header><Link href="/"><span>n2</span><strong>nice 2 network</strong></Link><div className="onboarding-progress" aria-label={`Step ${step+1} of 5`}>{slideNames.map((name,index)=><i key={name} className={index<=step?"done":""}/>)}</div><small>{step+1} / 5</small></header>
    <div className="onboarding-viewport"><div className="onboarding-track" style={{transform:`translateX(-${step*100}%)`}}>
      <section className="onboarding-slide"><div className="onboarding-copy"><span className="verified-banner compact"><Check size={14}/><span><strong>Account created</strong><small>Let’s make your network useful.</small></span></span><span className="eyebrow">PROFESSIONAL IDENTITY</span><h1 id="onboarding-title">What should people know about you?</h1><p>This shapes how members and projects understand the contribution you can make.</p></div><div className="onboarding-fields"><label>Profession<input value={draft.profession} onChange={event=>update("profession",event.target.value)} placeholder="e.g. Product designer"/></label><label>Industry<input value={draft.industry} onChange={event=>update("industry",event.target.value)} placeholder="e.g. Climate technology"/></label><label className="full">Short bio<textarea value={draft.bio} onChange={event=>update("bio",event.target.value)} placeholder="A little about your experience and what you want to contribute…" maxLength={600}/><small>{draft.bio.length}/600</small></label></div><SlideFooter step={step} error={error} onBack={()=>{}} onNext={next}/></section>
      <section className="onboarding-slide"><div className="onboarding-copy"><span className="eyebrow">CAREER SKILLS</span><h1>Rank the skills you want to be known for.</h1><p>Keeping this to three gives the matching engine a clear professional signal.</p></div><div className="onboarding-skill-fields"><label><b>1</b><span>Primary skill<small>Your strongest career skill.</small></span><input value={draft.primarySkill} onChange={event=>update("primarySkill",event.target.value)} placeholder="Product strategy"/></label><label><b>2</b><span>Secondary skill<small>A strong supporting capability.</small></span><input value={draft.secondarySkill} onChange={event=>update("secondarySkill",event.target.value)} placeholder="User research"/></label><label><b>3</b><span>Tertiary skill<small>A useful complementary skill.</small></span><input value={draft.tertiarySkill} onChange={event=>update("tertiarySkill",event.target.value)} placeholder="Prototyping"/></label></div><SlideFooter step={step} error={error} onBack={()=>setStep(0)} onNext={next}/></section>
      <section className="onboarding-slide"><form onSubmit={submit}><div className="onboarding-copy"><span className="eyebrow">INTERESTS & AVAILABILITY</span><h1>What kind of work should find you?</h1><p>Your interests, location and preferred way of working refine your first suggestions.</p></div><div className="onboarding-fields"><label className="full">Interests<input value={draft.interests} onChange={event=>update("interests",event.target.value)} placeholder="Climate, local communities, public good"/><small>Separate interests with commas.</small></label><label>Location<span className="onboarding-location"><MapPin size={15}/><input value={draft.location} onChange={event=>update("location",event.target.value)} placeholder="London, UK"/></span></label><label>Preferred working style<select value={draft.workMode} onChange={event=>update("workMode",event.target.value)}><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="in_person">In person</option></select></label></div><SlideFooter step={step} error={error} busy={busy} onBack={()=>setStep(1)} submit/></form></section>
      <section className="onboarding-slide suggestion-slide"><div className="onboarding-copy"><span className="eyebrow">PEOPLE FOR YOUR NETWORK</span><h1>Start with people who make sense.</h1><p>{network.length?"These members overlap with your skills, profession or interests.":"Your profile is ready. New people will appear here as the network grows."}</p></div><div className="people-suggestion-grid">{network.slice(0,4).map(member=><article key={member.id}>{member.image?<img src={member.image} alt=""/>:<span className="suggestion-avatar">n2</span>}<div><strong>{member.name??"n2 member"}</strong><small>{member.profession??"Member"}{member.location?` · ${member.location}`:""}</small><p>{[...member.sharedSkills,...member.sharedInterests].slice(0,2).join(" · ")||"Useful professional overlap"}</p></div><b>{member.score}</b></article>)}{!network.length&&<EmptySuggestion icon="people"/>}</div><SlideFooter step={step} onBack={()=>setStep(2)} onNext={()=>setStep(4)} nextLabel="See project suggestions"/></section>
      <section className="onboarding-slide suggestion-slide project-suggestion-slide"><div className="onboarding-copy"><span className="eyebrow">PROJECTS FOR YOU</span><h1>Your first places to contribute.</h1><p>{projects.length?"These active projects align with the profile you just built.":"Your profile is ready. Matching projects will surface as suitable roles open."}</p></div><div className="project-suggestion-grid">{projects.slice(0,4).map(project=><article key={project.id} style={{"--suggestion-accent":project.accent} as React.CSSProperties}><span>{project.industry}</span><h3>{project.title}</h3><p>{project.summary}</p><div>{project.reasons.slice(0,2).map(reason=><i key={reason}>{reason}</i>)}</div></article>)}{!projects.length&&<EmptySuggestion icon="projects"/>}</div><footer className="onboarding-final"><button type="button" className="secondary-button" onClick={()=>setStep(3)}><ArrowLeft size={15}/> Back</button><Link className="primary-button" href="/signin">Complete sign up <ArrowRight size={16}/></Link></footer></section>
    </div></div>
  </section></main>;
}

function SlideFooter({step,error,onBack,onNext,nextLabel="Continue",busy=false,submit=false}:{step:number;error?:string;onBack:()=>void;onNext?:()=>void;nextLabel?:string;busy?:boolean;submit?:boolean}){return <footer className="onboarding-actions"><span>{error&&<b role="alert">{error}</b>}</span>{step>0&&<button type="button" className="secondary-button" onClick={onBack}><ArrowLeft size={15}/> Back</button>}<button type={submit?"submit":"button"} className="primary-button" onClick={submit?undefined:onNext} disabled={busy}>{busy?<>Finding your matches… <Sparkles size={15}/></>:<>{nextLabel} <ArrowRight size={15}/></>}</button></footer>}
function EmptySuggestion({icon}:{icon:"people"|"projects"}){return <div className="onboarding-empty">{icon==="people"?<UsersRound size={22}/>:<BriefcaseBusiness size={22}/>}<strong>{icon==="people"?"Your network is taking shape":"Projects will find you"}</strong><p>We’ll keep using your profile to improve what appears.</p></div>}
