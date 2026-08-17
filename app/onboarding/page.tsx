"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, MapPin, Sparkles, UsersRound } from "lucide-react";
import {
  INDUSTRY_SUGGESTIONS,
  INTEREST_SUGGESTIONS,
  ONBOARDING_BIO_MIN_LENGTH,
  PROFESSION_SUGGESTIONS,
  SKILL_SUGGESTIONS,
  bioWordCount,
  hasUniqueValues,
  isMeaningfulOnboardingBio,
  isMeaningfulOnboardingValue,
  parseOnboardingInterests,
} from "@/lib/onboarding-profile";

type NetworkMember={id:string;name:string|null;image:string|null;profession:string|null;location:string|null;reasons:string[];score:number};
type ProjectSuggestion={id:string;title:string;summary:string;industry:string;stage:string;accent:string;workMode:string;location:string|null;score:number;reasons:string[]};
type ProfileDraft={profession:string;industry:string;bio:string;primarySkill:string;secondarySkill:string;tertiarySkill:string;interests:string;location:string;workMode:"remote"|"hybrid"|"in_person"};
type SkillField="primarySkill"|"secondarySkill"|"tertiarySkill";

const slideNames=["About you","Career skills","Interests","Visibility","People","Projects"];
const initialDraft:ProfileDraft={profession:"",industry:"",bio:"",primarySkill:"",secondarySkill:"",tertiarySkill:"",interests:"",location:"",workMode:"hybrid"};

function identityError(draft:ProfileDraft){
  const profession=draft.profession.trim(),industry=draft.industry.trim(),bio=draft.bio.trim();
  if(!profession)return "Enter your profession.";
  if(!isMeaningfulOnboardingValue(profession))return "Choose a suggestion or enter a specific profession.";
  if(profession.length>100)return "Profession must be 100 characters or fewer.";
  if(!industry)return "Enter your industry.";
  if(!isMeaningfulOnboardingValue(industry))return "Choose a suggestion or enter a specific industry.";
  if(industry.length>100)return "Industry must be 100 characters or fewer.";
  if(!bio)return "Enter a short bio.";
  if(bio.length<ONBOARDING_BIO_MIN_LENGTH)return `Short bio must be at least ${ONBOARDING_BIO_MIN_LENGTH} characters (${bio.length}/${ONBOARDING_BIO_MIN_LENGTH}).`;
  if(!isMeaningfulOnboardingBio(bio))return "Write at least 6 words about your experience and what you want to contribute.";
  if(bio.length>600)return "Short bio must be 600 characters or fewer.";
  return "";
}

function skillsError(draft:ProfileDraft){
  if(!isMeaningfulOnboardingValue(draft.primarySkill))return "Choose a suggestion or enter a specific primary skill.";
  if(draft.primarySkill.trim().length>80)return "Primary skill must be 80 characters or fewer.";
  if(!isMeaningfulOnboardingValue(draft.secondarySkill))return "Choose a suggestion or enter a specific secondary skill.";
  if(draft.secondarySkill.trim().length>80)return "Secondary skill must be 80 characters or fewer.";
  if(!isMeaningfulOnboardingValue(draft.tertiarySkill))return "Choose a suggestion or enter a specific tertiary skill.";
  if(draft.tertiarySkill.trim().length>80)return "Tertiary skill must be 80 characters or fewer.";
  if(!hasUniqueValues([draft.primarySkill,draft.secondarySkill,draft.tertiarySkill]))return "Choose three different skills so your profile has a clear range.";
  return "";
}

function interestsError(draft:ProfileDraft){
  const interests=parseOnboardingInterests(draft.interests);
  if(interests.length<2)return "Choose or enter at least two interests.";
  if(interests.length>20)return "Add no more than 20 interests.";
  if(interests.some(interest=>!isMeaningfulOnboardingValue(interest)))return "Each interest should be a meaningful topic, not a single letter or placeholder.";
  if(interests.some(interest=>interest.length>50))return "Each interest must be 50 characters or fewer.";
  if(!hasUniqueValues(interests))return "Remove duplicate interests.";
  if(!draft.location.trim())return "Enter your location.";
  if(draft.location.trim().length<2)return "Location must be at least 2 characters.";
  if(draft.location.trim().length>100)return "Location must be 100 characters or fewer.";
  return "";
}

export default function OnboardingPage(){
  const [step,setStep]=useState(0),[draft,setDraft]=useState(initialDraft),[activeSkill,setActiveSkill]=useState<SkillField>("primarySkill"),[networking,setNetworking]=useState({shareNetworkConnections:true,allowIntroductions:true}),[busy,setBusy]=useState(false),[error,setError]=useState(""),[network,setNetwork]=useState<NetworkMember[]>([]),[projects,setProjects]=useState<ProjectSuggestion[]>([]);
  const update=(field:keyof ProfileDraft,value:string)=>{setDraft(current=>({...current,[field]:value}));setError("")};
  const skillFields:SkillField[]=["primarySkill","secondarySkill","tertiarySkill"];
  const chooseSkill=(value:string)=>{
    const existing=skillFields.find(field=>draft[field].trim().toLowerCase()===value.toLowerCase());
    if(existing){setActiveSkill(existing);return}
    update(activeSkill,value);
    const nextEmpty=skillFields.find(field=>field!==activeSkill&&!draft[field].trim());
    if(nextEmpty)setActiveSkill(nextEmpty);
  };
  const toggleInterest=(value:string)=>{
    const values=parseOnboardingInterests(draft.interests),index=values.findIndex(item=>item.toLowerCase()===value.toLowerCase());
    update("interests",index>=0?values.filter((_,itemIndex)=>itemIndex!==index).join(", "):[...values,value].slice(0,20).join(", "));
  };
  function next(){
    setError("");
    const message=step===0?identityError(draft):step===1?skillsError(draft):"";
    if(message){setError(message);return}
    setStep(current=>Math.min(current+1,5));
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");
    const interests=parseOnboardingInterests(draft.interests);
    const validationError=interestsError(draft);
    if(validationError){setError(validationError);return}
    setBusy(true);
    try{
      const response=await fetch("/api/auth/onboarding",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...draft,...networking,interests})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok){setError(result.error??"We could not save your profile. Check your details and try again.");return}
      setNetwork(Array.isArray(result.network)?result.network:[]);
      setProjects(Array.isArray(result.projects)?result.projects:[]);
      setStep(4);
    }catch{
      setError("We could not reach n2. Check your connection and try again.");
    }finally{setBusy(false)}
  }
  return <main className="onboarding-page onboarding-flow"><div className="onboarding-backdrop"/><section className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
    <header><Link href="/"><span>n2</span><strong>nice 2 network</strong></Link><div className="onboarding-progress" aria-label={`Step ${step+1} of 6`}>{slideNames.map((name,index)=><i key={name} className={index<=step?"done":""}/>)}</div><small>{step+1} / 6</small></header>
    <div className="onboarding-viewport"><div className="onboarding-track" style={{transform:`translateX(-${step*100}%)`}}>
      <section className="onboarding-slide" aria-hidden={step!==0} inert={step!==0}><div className="onboarding-copy"><span className="verified-banner compact"><Check size={14}/><span><strong>Account created</strong><small>Let’s make your network useful.</small></span></span><span className="eyebrow">PROFESSIONAL IDENTITY</span><h1 id="onboarding-title">What should people know about you?</h1><p>This shapes how members and projects understand the contribution you can make.</p></div><div className="onboarding-fields"><label>Profession<input value={draft.profession} onChange={event=>update("profession",event.target.value)} placeholder="e.g. Product designer" minLength={2} maxLength={100}/></label><label>Industry<input value={draft.industry} onChange={event=>update("industry",event.target.value)} placeholder="e.g. Climate technology" minLength={2} maxLength={100}/></label><SuggestionChips label="Suggested roles" options={PROFESSION_SUGGESTIONS} selected={[draft.profession]} onSelect={value=>update("profession",value)}/><SuggestionChips label="Suggested industries" options={INDUSTRY_SUGGESTIONS} selected={[draft.industry]} onSelect={value=>update("industry",value)}/><label className="full">Short bio<textarea value={draft.bio} onChange={event=>update("bio",event.target.value)} placeholder="Describe your experience, the work you enjoy and what you can contribute…" minLength={ONBOARDING_BIO_MIN_LENGTH} maxLength={600} aria-describedby="short-bio-hint"/><small id="short-bio-hint">At least 6 words and {ONBOARDING_BIO_MIN_LENGTH} characters · {bioWordCount(draft.bio)} words · {draft.bio.length}/600 used</small></label></div><SlideFooter step={step} error={error} onBack={()=>{}} onNext={next}/></section>
      <section className="onboarding-slide" aria-hidden={step!==1} inert={step!==1}><div className="onboarding-copy"><span className="eyebrow">CAREER SKILLS</span><h1>Rank the skills you want to be known for.</h1><p>Choose three different skills. Tap a field, then use a suggestion or enter your own.</p></div><div className="onboarding-skill-fields"><label><b>1</b><span>Primary skill<small>Your strongest career skill.</small></span><input value={draft.primarySkill} onFocus={()=>setActiveSkill("primarySkill")} onChange={event=>update("primarySkill",event.target.value)} placeholder="Product strategy" maxLength={80}/></label><label><b>2</b><span>Secondary skill<small>A strong supporting capability.</small></span><input value={draft.secondarySkill} onFocus={()=>setActiveSkill("secondarySkill")} onChange={event=>update("secondarySkill",event.target.value)} placeholder="User research" maxLength={80}/></label><label><b>3</b><span>Tertiary skill<small>A useful complementary skill.</small></span><input value={draft.tertiarySkill} onFocus={()=>setActiveSkill("tertiarySkill")} onChange={event=>update("tertiarySkill",event.target.value)} placeholder="Prototyping" maxLength={80}/></label><SuggestionChips label={`Suggestions for ${activeSkill==="primarySkill"?"primary":activeSkill==="secondarySkill"?"secondary":"tertiary"} skill`} options={SKILL_SUGGESTIONS} selected={skillFields.map(field=>draft[field])} onSelect={chooseSkill}/></div><SlideFooter step={step} error={error} onBack={()=>setStep(0)} onNext={next}/></section>
      <section className="onboarding-slide" aria-hidden={step!==2} inert={step!==2}><div><div className="onboarding-copy"><span className="eyebrow">INTERESTS & AVAILABILITY</span><h1>What kind of work should find you?</h1><p>Choose at least two topics so your first suggestions have enough signal.</p></div><div className="onboarding-fields"><label className="full">Interests<input value={draft.interests} onChange={event=>update("interests",event.target.value)} placeholder="Climate action, local communities, public good"/><small>Choose or enter at least two · separate your own interests with commas.</small></label><SuggestionChips label="Suggested interests" options={INTEREST_SUGGESTIONS} selected={parseOnboardingInterests(draft.interests)} onSelect={toggleInterest}/><label>Location<span className="onboarding-location"><MapPin size={15}/><input value={draft.location} onChange={event=>update("location",event.target.value)} placeholder="London, UK" minLength={2} maxLength={100}/></span></label><label>Preferred working style<select value={draft.workMode} onChange={event=>update("workMode",event.target.value)}><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="in_person">In person</option></select></label></div><SlideFooter step={step} error={error} onBack={()=>setStep(1)} onNext={()=>{const message=interestsError(draft);if(message){setError(message);return}setError("");setStep(3)}}/></div></section>
      <section className="onboarding-slide" aria-hidden={step!==3} inert={step!==3}><form onSubmit={submit}><div className="onboarding-copy"><span className="eyebrow">NETWORK VISIBILITY</span><h1>Choose how your network can help others.</h1><p>Connection sharing reveals only permitted first- and second-degree paths. Introduction requests always require your approval.</p></div><div className="onboarding-visibility"><button type="button" className={networking.shareNetworkConnections?"active":""} aria-pressed={networking.shareNetworkConnections} onClick={()=>setNetworking(value=>({...value,shareNetworkConnections:!value.shareNetworkConnections}))}><UsersRound size={20}/><span><strong>Share my network connections</strong><small>Let followers discover permitted members of your network.</small></span><i>{networking.shareNetworkConnections?"On":"Off"}</i></button><button type="button" className={networking.allowIntroductions?"active":""} aria-pressed={networking.allowIntroductions} onClick={()=>setNetworking(value=>({...value,allowIntroductions:!value.allowIntroductions}))}><Sparkles size={20}/><span><strong>Allow warm introduction requests</strong><small>You decide whether each request becomes a conversation.</small></span><i>{networking.allowIntroductions?"On":"Off"}</i></button><p>You can change both choices any time in Settings → Networking.</p></div><SlideFooter step={step} error={error} busy={busy} onBack={()=>setStep(2)} submit nextLabel="Build my network"/></form></section>
      <section className="onboarding-slide suggestion-slide" aria-hidden={step!==4} inert={step!==4}><div className="onboarding-copy"><span className="eyebrow">PEOPLE FOR YOUR NETWORK</span><h1>Start with people who make sense.</h1><p>{network.length?"These members could contribute to the same work or complement your experience.":"Your profile is ready. New people will appear here as the network grows."}</p></div><div className="people-suggestion-grid">{network.slice(0,4).map(member=><article key={member.id}>{member.image?<img src={member.image} alt=""/>:<span className="suggestion-avatar">n2</span>}<div><strong>{member.name??"n2 member"}</strong><small>{member.profession??"Member"}{member.location?` · ${member.location}`:""}</small><p>{member.reasons.slice(0,2).join(" · ")||"Useful professional overlap"}</p></div><b>{member.score}</b></article>)}{!network.length&&<EmptySuggestion icon="people"/>}</div><SlideFooter step={step} onBack={()=>setStep(3)} onNext={()=>setStep(5)} nextLabel="See project suggestions"/></section>
      <section className="onboarding-slide suggestion-slide project-suggestion-slide" aria-hidden={step!==5} inert={step!==5}><div className="onboarding-copy"><span className="eyebrow">PROJECTS FOR YOU</span><h1>Your first places to contribute.</h1><p>{projects.length?"These active projects align with the profile you just built.":"Your profile is ready. Matching projects will surface as suitable roles open."}</p></div><div className="project-suggestion-grid">{projects.slice(0,4).map(project=><article key={project.id} style={{"--suggestion-accent":project.accent} as React.CSSProperties}><span>{project.industry}</span><h3>{project.title}</h3><p>{project.summary}</p><div>{project.reasons.slice(0,2).map(reason=><i key={reason}>{reason}</i>)}</div></article>)}{!projects.length&&<EmptySuggestion icon="projects"/>}</div><footer className="onboarding-final"><button type="button" className="secondary-button" onClick={()=>setStep(4)}><ArrowLeft size={15}/> Back</button><Link className="primary-button" href="/signin">Complete sign up <ArrowRight size={16}/></Link></footer></section>
    </div></div>
  </section></main>;
}

function SlideFooter({step,error,onBack,onNext,nextLabel="Continue",busy=false,submit=false}:{step:number;error?:string;onBack:()=>void;onNext?:()=>void;nextLabel?:string;busy?:boolean;submit?:boolean}){return <footer className="onboarding-actions"><span>{error&&<b role="alert">{error}</b>}</span>{step>0&&<button type="button" className="secondary-button" onClick={onBack}><ArrowLeft size={15}/> Back</button>}<button type={submit?"submit":"button"} className="primary-button" onClick={submit?undefined:onNext} disabled={busy}>{busy?<>Finding your matches… <Sparkles size={15}/></>:<>{nextLabel} <ArrowRight size={15}/></>}</button></footer>}
function SuggestionChips({label,options,selected,onSelect}:{label:string;options:readonly string[];selected:string[];onSelect:(value:string)=>void}){const chosen=new Set(selected.map(value=>value.trim().toLowerCase()).filter(Boolean));return <div className="onboarding-suggestions"><span>{label}</span><div>{options.map(option=><button type="button" key={option} className={chosen.has(option.toLowerCase())?"active":""} aria-pressed={chosen.has(option.toLowerCase())} onClick={()=>onSelect(option)}>{option}</button>)}</div></div>}
function EmptySuggestion({icon}:{icon:"people"|"projects"}){return <div className="onboarding-empty">{icon==="people"?<UsersRound size={22}/>:<BriefcaseBusiness size={22}/>}<strong>{icon==="people"?"Your network is taking shape":"Projects will find you"}</strong><p>We’ll keep using your profile to improve what appears.</p></div>}
