"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Circle,
  Clock3,
  Ellipsis,
  Eye,
  Home,
  Lightbulb,
  Link2,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UserPlus,
  UsersRound,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

type View = "feed" | "projects" | "messages" | "meet" | "profile" | "settings";

const people = {
  maya: { name: "Maya Chen", role: "Product Designer", img: "https://i.pravatar.cc/160?img=47" },
  marcus: { name: "Marcus Okafor", role: "Founder · Clean Energy", img: "https://i.pravatar.cc/160?img=12" },
  lena: { name: "Lena Vogt", role: "Brand Strategist", img: "https://i.pravatar.cc/160?img=32" },
  dev: { name: "Dev Shah", role: "Full-stack Engineer", img: "https://i.pravatar.cc/160?img=11" },
  ali: { name: "Ali Rahman", role: "Operations", img: "https://i.pravatar.cc/160?img=51" },
  sofia: { name: "Sofia Reyes", role: "Urban Planner", img: "https://i.pravatar.cc/160?img=45" },
  jordan: { name: "Jordan Lee", role: "Community Builder", img: "https://i.pravatar.cc/160?img=14" },
};

const nav = [
  { id: "feed" as View, label: "Home", icon: Home },
  { id: "projects" as View, label: "Projects", icon: BriefcaseBusiness },
  { id: "messages" as View, label: "Messages", icon: MessageCircle, count: 3 },
  { id: "meet" as View, label: "Meet", icon: CalendarDays },
];

function Avatar({ person, size = "md", ring = false }: { person: (typeof people)[keyof typeof people]; size?: "sm" | "md" | "lg" | "xl"; ring?: boolean }) {
  // Remote prototype avatars are intentionally direct; production should use member-uploaded optimized assets.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`avatar avatar-${size} ${ring ? "avatar-ring" : ""}`} src={person.img} alt={person.name} />;
}

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button className="logo" aria-label="Nice 2 Network home" onClick={onClick}>
      <span className="logo-mark">n2</span>
      <span>nice 2 network</span>
    </button>
  );
}

function N2Mark({ inverse = false }: { inverse?: boolean }) {
  return <span className={`n2-ai-mark ${inverse ? "inverse" : ""}`} aria-label="n2 intelligence">n2</span>;
}

function TeamTrail({ second = false }: { second?: boolean }) {
  const team = second
    ? [people.sofia, people.jordan, people.lena]
    : [people.marcus, people.maya, people.dev, people.ali];
  return (
    <div className="team-map" aria-label="Project team and open roles">
      <div className="map-line" />
      <div className="team-person owner">
        <Avatar person={team[0]} size="lg" ring />
        <span className="team-role">Owner</span>
      </div>
      {team.slice(1).map((person, index) => (
        <div className="team-person" key={person.name}>
          <Avatar person={person} size="md" />
          <span className="dept">{index === 0 ? "Design" : index === 1 ? "Tech" : "Operations"}</span>
        </div>
      ))}
      <div className="open-person">
        <Plus size={16} />
        <span>{second ? "Finance" : "Growth"}</span>
      </div>
    </div>
  );
}

function InterestButton({ initial = 24, projectId }: { initial?: number; projectId: string }) {
  const [watched, setWatched] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setWatched(localStorage.getItem(`n2-eye-${projectId}`) === "true"));
    return () => cancelAnimationFrame(frame);
  }, [projectId]);
  function toggle() {
    const next = !watched;
    setWatched(next);
    localStorage.setItem(`n2-eye-${projectId}`, String(next));
  }
  return (
    <button className={`interest-btn ${watched ? "active" : ""}`} onClick={toggle} aria-pressed={watched}>
      <Eye size={18} />
      <span>{watched ? initial + 1 : initial} eyes</span>
    </button>
  );
}

function ProjectCard({ second = false, onMatch, onMessage }: { second?: boolean; onMatch?: () => void; onMessage?: () => void }) {
  const owner = second ? people.sofia : people.marcus;
  return (
    <article className={`project-card ${second ? "project-blue" : "project-orange"}`}>
      <div className="project-accent" />
      <div className="project-body">
        <div className="post-head">
          <div className="person-line">
            <Avatar person={owner} size="md" />
            <div>
              <strong>{owner.name}</strong>
              <span>{owner.role} · {second ? "3h" : "18m"}</span>
            </div>
          </div>
          <button className="icon-button" aria-label="Project options"><Ellipsis size={20} /></button>
        </div>
        <div className="project-kicker"><span>PROJECT</span><span>{second ? "COMMUNITY" : "CLIMATE"}</span></div>
        <h2>{second ? "Make empty city spaces useful after dark" : "Neighbourhood energy, shared fairly"}</h2>
        <p className="project-copy">
          {second
            ? "A lightweight way for local groups to find and book underused spaces for classes, studios and community dinners. Looking for people who understand access, safety and local partnerships."
            : "I’m building a toolkit that helps one street buy, share and understand clean energy together. The pilot needs a product thinker, a community voice and someone who can make the numbers work."}
        </p>
        <div className="project-meta">
          <span><Clock3 size={15} /> {second ? "Early concept" : "Pilot in 6 weeks"}</span>
          <span><UsersRound size={15} /> {second ? "3 involved" : "4 involved"}</span>
        </div>
        <TeamTrail second={second} />
        <div className="ai-gap">
          <div className="ai-icon"><N2Mark inverse /></div>
          <div>
            <strong>One useful connection</strong>
            <p>{second ? "A finance lead could turn this into a sustainable local model." : "A growth lead with community launch experience would round out this team."}</p>
          </div>
          <button onClick={onMatch}>See match <ArrowUpRight size={15} /></button>
        </div>
        <div className="post-actions">
          <InterestButton projectId={second ? "after-dark" : "energy"} initial={second ? 41 : 24} />
          <button onClick={onMessage}><MessageCircle size={18} /> {second ? 12 : 8}</button>
          <button className="share-button" onClick={() => navigator.clipboard?.writeText(window.location.href)}><Link2 size={17} /> Copy link</button>
        </div>
      </div>
    </article>
  );
}

function CreateProject({ onClose, onPublish }: { onClose: () => void; onPublish: () => void }) {
  const [step, setStep] = useState(0);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button>
          <span>{step === 0 ? "New project" : "Suggested team"}</span>
          <span className="step-count">{step + 1}/2</span>
        </div>
        {step === 0 ? (
          <div className="modal-content">
            <span className="eyebrow">START WITH THE SPARK</span>
            <h2 id="modal-title">What would you like to make happen?</h2>
            <textarea placeholder="Describe the idea, why it matters, and where you'd like help…" defaultValue="A Saturday workshop where young people repair and customise old clothes with local designers." />
            <div className="field-row">
              <label>Stage<select defaultValue="Idea"><option>Idea</option><option>Planning</option><option>Building</option></select></label>
              <label>Industry<select defaultValue="Community"><option>Community</option><option>Technology</option><option>Climate</option><option>Creative</option></select></label>
            </div>
            <button className="primary-button wide" onClick={() => setStep(1)}>Find the gaps <N2Mark inverse /></button>
          </div>
        ) : (
          <div className="modal-content ai-result">
            <div className="ai-orbit"><N2Mark /><span>n2 project map</span></div>
            <h2 id="modal-title">A strong start needs three perspectives.</h2>
            <p>Based on your idea, we’ll recommend it to people in these areas.</p>
            <div className="role-list">
              {["Fashion designer", "Youth facilitator", "Venue partner"].map((role, i) => <div key={role}><span>{i + 1}</span><strong>{role}</strong><Check size={18} /></div>)}
            </div>
            <button className="primary-button wide" onClick={() => { onPublish(); onClose(); }}>Publish project <ArrowUpRight size={17} /></button>
          </div>
        )}
      </section>
    </div>
  );
}

function Feed({ onCreate, onMatch, onMessage }: { onCreate: () => void; onMatch: () => void; onMessage: () => void }) {
  const [filter, setFilter] = useState("For you");
  return (
    <>
      <div className="mobile-topbar"><Logo /><button className="icon-button"><Bell size={20} /></button></div>
      <header className="feed-intro">
        <div>
          <span className="eyebrow">TUESDAY, 12 AUGUST</span>
          <h1>Good morning, Maya.</h1>
          <p>Three projects could use someone like you today.</p>
        </div>
        <button className="primary-button" onClick={onCreate}><Plus size={18} /> Start a project</button>
      </header>
      <section className="composer">
        <Avatar person={people.maya} size="md" />
        <button onClick={onCreate}>Share an idea that needs good people…</button>
        <span><Lightbulb size={18} /></span>
      </section>
      <div className="feed-filter">
        {["For you","Following","Newest"].map(item => <button key={item} className={filter===item?"active":""} onClick={()=>setFilter(item)}>{item}</button>)}
        <button className="filter-control"><SlidersHorizontal size={14}/> Filters</button>
      </div>
      {filter === "Following" && <div className="feed-context"><UsersRound size={16}/><span>Projects from people you know, with open roles that fit your network.</span></div>}
      {filter === "Newest" && <div className="feed-context"><Clock3 size={16}/><span>Fresh ideas from the last 24 hours.</span></div>}
      <ProjectCard onMatch={onMatch} onMessage={onMessage} />
      <article className="connection-card">
        <div className="connection-copy"><span className="eyebrow">WORTH MEETING</span><h3>You and Lena both care about purposeful brands.</h3><p>She’s looking to meet product designers working on climate and public good.</p><button>View Lena’s profile <ArrowUpRight size={16} /></button></div>
        <Avatar person={people.lena} size="xl" ring />
      </article>
      <ProjectCard second onMatch={onMatch} onMessage={onMessage} />
      <div className="end-note"><span>n2</span><p>You’re all caught up for now.</p></div>
    </>
  );
}

function ProjectsView({ onCreate, hasNewProject }: { onCreate: () => void; hasNewProject: boolean }) {
  return (
    <div className="subpage">
      <div className="subpage-head"><div><span className="eyebrow">YOUR WORK</span><h1>Projects</h1><p>The ideas you started and the ones you’re helping grow.</p></div><button className="primary-button" onClick={onCreate}><Plus size={18} /> New project</button></div>
      <div className="stats-row"><div><strong>{hasNewProject ? "03" : "02"}</strong><span>Created</span></div><div><strong>04</strong><span>Involved</span></div><div><strong>128</strong><span>Eyes placed</span></div></div>
      <div className="section-title"><h3>In motion</h3><button>View all <ArrowUpRight size={15} /></button></div>
      {hasNewProject && <article className="created-project-card"><div className="created-orbit"><span>1</span><span>0</span><span>0</span></div><div><span className="eyebrow">JUST PUBLISHED · COMMUNITY</span><h3>Repair, remake, pass it on</h3><p>A Saturday workshop where young people customise old clothes with local designers.</p><div className="role-chips"><span>Fashion designer</span><span>Youth facilitator</span><span>Venue partner</span></div></div><button className="icon-button border"><ArrowUpRight size={18}/></button></article>}
      <ProjectWorkbench />
      <ProjectCard />
    </div>
  );
}

function ProjectWorkbench(){
  const [tab,setTab]=useState<"roles"|"milestones"|"history">("roles");
  const [applied,setApplied]=useState(false);
  const [done,setDone]=useState([true,false,false]);
  return <section className="workbench"><div className="workbench-head"><div><span className="eyebrow">PROJECT WORKSPACE</span><h3>Neighbourhood energy</h3></div><span className="active-pill">ACTIVE</span></div><div className="workbench-tabs"><button className={tab==="roles"?"active":""} onClick={()=>setTab("roles")}>Roles <b>1</b></button><button className={tab==="milestones"?"active":""} onClick={()=>setTab("milestones")}>Milestones</button><button className={tab==="history"?"active":""} onClick={()=>setTab("history")}>History</button></div>{tab==="roles"&&<div className="open-role-card"><div className="open-role-icon"><UserPlus size={18}/></div><div><span className="eyebrow">GROWTH · 1 SPOT</span><strong>Community growth lead</strong><p>Own the pilot launch, partnerships and first 50 households.</p><div className="skill-chips small"><span>Community launch</span><span>Partnerships</span></div></div><button className={applied?"applied-button":"secondary-button"} onClick={()=>setApplied(!applied)}>{applied?<><Check size={14}/> Applied</>:"View role"}</button></div>}{tab==="milestones"&&<div className="milestone-list">{[["Neighbour interviews","12 Aug"],["Pilot partner confirmed","22 Aug"],["Launch one-street pilot","30 Sep"]].map(([title,date],i)=><button key={title} onClick={()=>setDone(done.map((v,n)=>n===i?!v:v))}><span className={done[i]?"milestone-check done":"milestone-check"}>{done[i]?<Check size={14}/>:<Circle size={14}/>}</span><span><strong>{title}</strong><small>{done[i]?"Completed":`Due ${date}`}</small></span></button>)}</div>}{tab==="history"&&<div className="history-list"><div><span/><p><strong>Marcus</strong> added a project update<small>Today, 10:18</small></p></div><div><span/><p><strong>Maya</strong> completed Neighbour interviews<small>Yesterday, 16:42</small></p></div><div><span/><p><strong>Dev</strong> joined the Technology department<small>8 Aug, 09:06</small></p></div></div>}</section>
}

function MessagesView() {
  const contacts = [people.marcus, people.lena, people.sofia, people.dev];
  const [selected, setSelected] = useState<(typeof contacts)[number] | null>(null);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  if (selected) return (
    <div className="subpage messages-page conversation-page">
      <div className="conversation-head"><button className="icon-button border" onClick={()=>setSelected(null)} aria-label="Back"><ArrowLeft size={18}/></button><Avatar person={selected} size="md"/><div><strong>{selected.name}</strong><span>{selected.role} · Active now</span></div><button className="secondary-button">Meet</button></div>
      <div className="conversation-context"><N2Mark/><p>You’re both involved in <strong>Neighbourhood energy</strong>. Start with the shared project.</p></div>
      <div className="chat-flow">
        <div className="chat-date">TODAY</div>
        <div className="bubble theirs">Hi Maya — your prototype made the idea feel tangible. Would you be open to joining our first working session?</div>
        <div className="bubble mine">Absolutely. I can also introduce a researcher who worked on a similar community pilot.</div>
        <div className="bubble theirs">That intro would be brilliant, thank you.</div>
        {sent.map((message,i)=><div className="bubble mine" key={`${message}-${i}`}>{message}</div>)}
      </div>
      <form className="chat-composer" onSubmit={(e)=>{e.preventDefault();if(draft.trim()){setSent([...sent,draft.trim()]);setDraft("")}}}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={`Message ${selected.name.split(" ")[0]}…`}/><button aria-label="Send message"><Send size={17}/></button></form>
    </div>
  );
  return (
    <div className="subpage messages-page">
      <div className="subpage-head compact"><div><span className="eyebrow">CONVERSATIONS</span><h1>Messages</h1></div><button className="icon-button border"><Plus size={20} /></button></div>
      <div className="message-search"><Search size={18} /><input placeholder="Search conversations" /></div>
      <div className="message-list">
        {contacts.map((person, i) => <button onClick={()=>setSelected(person)} className={i === 0 ? "unread" : ""} key={person.name}><Avatar person={person} size="md" /><span><strong>{person.name}</strong><small>{i === 0 ? "That intro would be brilliant, thank you." : i === 1 ? "See you at Thursday’s meet." : "Shared a project with you"}</small></span><time>{i === 0 ? "10:42" : i === 1 ? "Mon" : "Fri"}</time></button>)}
      </div>
    </div>
  );
}

function MeetView() {
  const [joined, setJoined] = useState(false);
  const [selectedDay, setSelectedDay] = useState(12);
  const [calendarView, setCalendarView] = useState<"agenda" | "month">("agenda");
  const eventDays = [12, 14, 20, 27];
  return (
    <div className="subpage">
      <div className="subpage-head"><div><span className="eyebrow">AUGUST 2026</span><h1>Meet</h1><p>Small rooms, useful conversations.</p></div><div className="meet-head-actions"><div className="view-toggle" aria-label="Calendar view"><button className={calendarView==="agenda"?"active":""} onClick={()=>setCalendarView("agenda")}>Agenda</button><button className={calendarView==="month"?"active":""} onClick={()=>setCalendarView("month")}>Month</button></div><button className="primary-button"><Plus size={18} /> Add a meet</button></div></div>
      <div className="calendar-connections"><div><span className="calendar-brand google">G</span><p><strong>Google Calendar & Meet</strong><small>Schedule and add Meet links</small></p><a href="/api/integrations/google/connect">Connect</a></div><div><span className="calendar-brand microsoft">M</span><p><strong>Microsoft Teams & Outlook</strong><small>Create Teams meetings</small></p><a href="/api/integrations/microsoft/connect">Connect</a></div></div>
      {calendarView==="agenda" ? <div className="calendar-strip">{[["TUE",12],["WED",13],["THU",14],["FRI",15],["SAT",16]].map(([d,n])=><button onClick={()=>setSelectedDay(Number(n))} className={Number(n)===selectedDay?"active":""} key={n}><span>{d}</span><strong>{n}</strong>{eventDays.includes(Number(n))&&<i/>}</button>)}</div> : <div className="month-calendar"><div className="month-title"><button aria-label="Previous month">‹</button><strong>August 2026</strong><button aria-label="Next month">›</button></div><div className="month-weekdays">{["MON","TUE","WED","THU","FRI","SAT","SUN"].map(day=><span key={day}>{day}</span>)}</div><div className="month-grid">{Array.from({length:5},(_,i)=><span className="empty" key={`empty-${i}`}/>)}{Array.from({length:31},(_,i)=>i+1).map(n=><button key={n} className={`${n===selectedDay?"selected":""} ${eventDays.includes(n)?"has-event":""}`} onClick={()=>setSelectedDay(n)}><span>{n}</span>{eventDays.includes(n)&&<i/>}</button>)}</div></div>}
      <div className="section-title"><h3>{selectedDay===12?"Today":`August ${selectedDay}`}</h3><span>{eventDays.includes(selectedDay)?(selectedDay===12?"2 meets":"1 meet"):"No meets"}</span></div>
      {!eventDays.includes(selectedDay)&&<div className="empty-meets"><CalendarDays size={20}/><strong>Nothing planned yet</strong><p>Add a small room or keep this day clear.</p></div>}
      {eventDays.includes(selectedDay)&&<>
      <div className="meet-card"><div className="meet-time"><strong>12:30</strong><span>45 min</span></div><div><span className="tag">TEAMS</span><h3>Clean energy pilot: first working session</h3><p>Marcus, Dev, Ali and you</p><div className="mini-stack"><Avatar person={people.marcus} size="sm"/><Avatar person={people.dev} size="sm"/><Avatar person={people.ali} size="sm"/></div></div><button className={`join-button ${joined?"joined":""}`} onClick={()=>setJoined(!joined)}>{joined?<><Check size={14}/> Added</>:"Join"}</button></div>
      {selectedDay===12&&<div className="meet-card"><div className="meet-time"><strong>17:00</strong><span>In person</span></div><div><span className="tag dark">NETWORK</span><h3>Creative collisions · Shoreditch</h3><p>18 people from design, food, tech and culture</p></div><button className="icon-button border"><ArrowUpRight size={18}/></button></div>}</>}
    </div>
  );
}

function ProfileView() {
  return (
    <div className="subpage profile-page">
      <div className="profile-cover"><span>n2</span></div>
      <div className="profile-main"><Avatar person={people.maya} size="xl" ring/><button className="secondary-button">Edit profile</button><h1>Maya Chen</h1><p className="profile-role">Product designer · Civic technology</p><p className="profile-bio">I turn complex public services into things people can actually use. Interested in climate, local communities and unexpected collaborations.</p><div className="skill-chips"><span>Product design</span><span>Research</span><span>Prototyping</span><span>Public good</span></div><div className="profile-numbers"><div><strong>04</strong><span>Projects</span></div><div><strong>38</strong><span>Connections</span></div><div><strong>12</strong><span>Meets</span></div></div></div>
    </div>
  );
}

function MatchPanel({ onClose, onMessage }: { onClose: () => void; onMessage: () => void }) {
  const [feedback,setFeedback]=useState<"helpful"|"not_relevant"|null>(null);
  function rate(signal:"helpful"|"not_relevant"){setFeedback(signal);fetch("/api/matches/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({matchKey:"lena-energy-growth",signal,scoreSnapshot:94,features:{skills:.9,interests:.8,industry:.7}})}).catch(()=>undefined)}
  return <div className="modal-backdrop" role="presentation" onMouseDown={e=>e.currentTarget===e.target&&onClose()}><section className="match-panel" role="dialog" aria-modal="true"><div className="modal-head"><button className="icon-button" onClick={onClose}><X size={20}/></button><span>Why this match</span><span className="match-score">94%</span></div><div className="match-body"><span className="eyebrow">A USEFUL CONNECTION</span><div className="match-person"><Avatar person={people.lena} size="xl" ring/><div><h2>Lena Vogt</h2><p>Brand strategist · Climate and public good</p><span><MapPin size={13}/> London · 2 mutual connections</span></div></div><div className="reason-grid"><div><N2Mark/><strong>Project fit</strong><p>Lena has launched two neighbourhood climate programmes.</p></div><div><UsersRound size={16}/><strong>Working style</strong><p>You both prefer small pilots before scaling.</p></div><div><Bookmark size={16}/><strong>Shared interest</strong><p>Community ownership and accessible services.</p></div></div><div className="warm-intro"><Avatar person={people.marcus} size="sm"/><p><strong>Marcus can introduce you.</strong><br/>A warm introduction makes this connection 3× more likely to lead somewhere useful.</p></div><div className="match-feedback"><span>{feedback?"Thanks — your matches will adapt.":"Is this match useful?"}</span><button className={feedback==="helpful"?"active":""} onClick={()=>rate("helpful")}><ThumbsUp size={14}/></button><button className={feedback==="not_relevant"?"active":""} onClick={()=>rate("not_relevant")}><ThumbsDown size={14}/></button></div><div className="match-actions"><button className="secondary-button" onClick={onClose}>Maybe later</button><button className="primary-button" onClick={onMessage}><MessageCircle size={16}/> Ask for intro</button></div></div></section></div>;
}

function SearchOverlay({ onClose, onNavigate }: { onClose: () => void; onNavigate: (view: View) => void }) {
  const [query,setQuery]=useState("");
  return <div className="search-overlay" role="dialog" aria-modal="true"><div className="search-modal"><div className="search-field"><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search people, skills or projects"/><button onClick={onClose}>ESC</button></div><div className="search-results"><span className="eyebrow">{query?"BEST MATCHES":"TRY A SEARCH"}</span>{query?<><button onClick={()=>{onNavigate("profile");onClose()}}><Avatar person={people.lena} size="md"/><span><strong>Lena Vogt</strong><small>Brand strategy · climate · community</small></span><ArrowUpRight size={17}/></button><button onClick={()=>{onNavigate("projects");onClose()}}><span className="result-icon"><BriefcaseBusiness size={18}/></span><span><strong>Neighbourhood energy, shared fairly</strong><small>Project · Climate · Growth role open</small></span><ArrowUpRight size={17}/></button></>:<div className="search-prompts"><button onClick={()=>setQuery("Climate projects")}>Climate projects</button><button onClick={()=>setQuery("Product designers")}>Product designers</button><button onClick={()=>setQuery("Near me")}>Near me</button></div>}</div></div></div>;
}

function SettingsView() {
  const [recommendations, setRecommendations] = useState(true);
  const [availability, setAvailability] = useState(true);
  const [panel,setPanel]=useState<"root"|"profile"|"notifications"|"calendar"|"privacy">("root");
  const [saved,setSaved]=useState(false);
  const [profile,setProfile]=useState({name:"Maya Chen",headline:"Product designer · Civic technology",industry:"Design & public services",bio:"I turn complex public services into things people can actually use.",skills:"Product design, Research, Prototyping",interests:"Climate, Local communities, Public good"});
  const [notifications,setNotifications]=useState({messages:true,projects:true,matches:true,meets:true,digest:"Weekly"});
  const [calendarPrefs,setCalendarPrefs]=useState({defaultCalendar:"Google Calendar",autoLinks:true,showExternal:true});
  const [privacy,setPrivacy]=useState({visibility:"Network only",searchable:true,showInterests:true,showLocation:false,messages:"Connections and project members"});
  useEffect(()=>{const frame=requestAnimationFrame(()=>{const stored=localStorage.getItem("n2-settings");if(!stored)return;try{const value=JSON.parse(stored);if(value.profile)setProfile(value.profile);if(value.notifications)setNotifications(value.notifications);if(value.calendarPrefs)setCalendarPrefs(value.calendarPrefs);if(value.privacy)setPrivacy(value.privacy);if(typeof value.recommendations==="boolean")setRecommendations(value.recommendations);if(typeof value.availability==="boolean")setAvailability(value.availability)}catch{/* Keep safe defaults when local settings are invalid. */}});return()=>cancelAnimationFrame(frame)},[]);
  function saveSettings(){localStorage.setItem("n2-settings",JSON.stringify({profile,notifications,calendarPrefs,privacy,recommendations,availability}));setSaved(true);setTimeout(()=>setSaved(false),2200);if(panel==="privacy")fetch("/api/privacy",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({profileVisibility:privacy.visibility.toLowerCase().replaceAll(" ","_"),discoverable:privacy.searchable,showInterests:privacy.showInterests,showLocation:privacy.showLocation,messagePermission:privacy.messages})}).catch(()=>undefined)}
  const toggle=(on:boolean,action:()=>void,label:string)=><button aria-label={label} aria-pressed={on} className={`toggle ${on?"on":""}`} onClick={action}><i/></button>;
  if(panel!=="root"){
    const titles={profile:["Profile and expertise","Help useful people understand what you bring."],notifications:["Messages and notifications","Choose what deserves your attention."],calendar:["Calendar connections","Bring Google, Outlook, Meet and Teams together."],privacy:["Privacy and visibility","Decide who can find, contact and understand you."]} as const;
    return <div className="subpage settings-page settings-detail"><div className="detail-head"><button className="icon-button border" onClick={()=>setPanel("root")} aria-label="Back to settings"><ArrowLeft size={18}/></button><div><span className="eyebrow">SETTINGS</span><h1>{titles[panel][0]}</h1><p>{titles[panel][1]}</p></div><button className={`save-button ${saved?"saved":""}`} onClick={saveSettings}>{saved?<><Check size={15}/> Saved</>:"Save changes"}</button></div>
      {panel==="profile"&&<div className="settings-form"><div className="profile-settings-lead"><Avatar person={people.maya} size="lg"/><div><strong>Profile picture</strong><small>Use a clear photo so people recognise you in person.</small></div><button>Change</button></div><div className="form-grid"><label>Full name<input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></label><label>Professional headline<input value={profile.headline} onChange={e=>setProfile({...profile,headline:e.target.value})}/></label><label>Industry<select value={profile.industry} onChange={e=>setProfile({...profile,industry:e.target.value})}><option>Design & public services</option><option>Technology</option><option>Climate & energy</option><option>Creative industries</option><option>Community & nonprofit</option></select></label><label className="full">Short bio<textarea value={profile.bio} onChange={e=>setProfile({...profile,bio:e.target.value})}/><small>Share the problems you enjoy solving and the contribution you make.</small></label><label className="full">Skills<input value={profile.skills} onChange={e=>setProfile({...profile,skills:e.target.value})}/><small>Separate skills with commas.</small></label><label className="full">Interests<input value={profile.interests} onChange={e=>setProfile({...profile,interests:e.target.value})}/></label></div></div>}
      {panel==="notifications"&&<div className="settings-form"><div className="settings-section-title"><strong>Direct activity</strong><small>Immediate updates for things involving you.</small></div>{[["New messages","When someone starts or replies to a conversation","messages"],["Project invitations","Applications, invitations and role changes","projects"],["Recommended matches","High-quality people and project suggestions","matches"],["Meet reminders","A reminder before an upcoming room or event","meets"]].map(([title,copy,key])=><div className="preference-row" key={key}><span><strong>{title}</strong><small>{copy}</small></span>{toggle(notifications[key as keyof typeof notifications]===true,()=>setNotifications({...notifications,[key]:!notifications[key as keyof typeof notifications]}),`Toggle ${title}`)}</div>)}<label className="select-setting"><span><strong>Email digest</strong><small>A calm summary of network activity.</small></span><select aria-label="Email digest frequency" value={notifications.digest} onChange={e=>setNotifications({...notifications,digest:e.target.value})}><option>Daily</option><option>Weekly</option><option>Never</option></select></label></div>}
      {panel==="calendar"&&<div className="settings-form"><div className="connection-setting"><span className="calendar-brand google">G</span><span><strong>Google Calendar & Meet</strong><small>Not connected</small></span><a href="/api/integrations/google/connect">Connect</a></div><div className="connection-setting"><span className="calendar-brand microsoft">M</span><span><strong>Microsoft Outlook & Teams</strong><small>Not connected</small></span><a href="/api/integrations/microsoft/connect">Connect</a></div><label className="select-setting spaced"><span><strong>Default calendar</strong><small>New n2 meets will be added here.</small></span><select aria-label="Default calendar" value={calendarPrefs.defaultCalendar} onChange={e=>setCalendarPrefs({...calendarPrefs,defaultCalendar:e.target.value})}><option>Google Calendar</option><option>Microsoft Outlook</option><option>Ask each time</option></select></label><div className="preference-row"><span><strong>Add video links automatically</strong><small>Use Meet or Teams based on the selected calendar.</small></span>{toggle(calendarPrefs.autoLinks,()=>setCalendarPrefs({...calendarPrefs,autoLinks:!calendarPrefs.autoLinks}),"Toggle automatic video links")}</div><div className="preference-row"><span><strong>Show external events in Meet</strong><small>Display busy time without exposing private event details.</small></span>{toggle(calendarPrefs.showExternal,()=>setCalendarPrefs({...calendarPrefs,showExternal:!calendarPrefs.showExternal}),"Toggle external events")}</div></div>}
      {panel==="privacy"&&<div className="settings-form"><label className="select-setting"><span><strong>Profile visibility</strong><small>Who can open your complete member profile.</small></span><select aria-label="Profile visibility" value={privacy.visibility} onChange={e=>setPrivacy({...privacy,visibility:e.target.value})}><option>Network only</option><option>Connections only</option><option>Private</option></select></label>{[["Appear in search","Let members find you by name, skill and industry","searchable"],["Show interests","Use interests to make useful connections visible","showInterests"],["Show approximate location","Share your city, never your precise location","showLocation"]].map(([title,copy,key])=><div className="preference-row" key={key}><span><strong>{title}</strong><small>{copy}</small></span>{toggle(privacy[key as keyof typeof privacy]===true,()=>setPrivacy({...privacy,[key]:!privacy[key as keyof typeof privacy]}),`Toggle ${title}`)}</div>)}<label className="select-setting"><span><strong>Who can message you</strong><small>Project owners can always contact applicants.</small></span><select aria-label="Message permissions" value={privacy.messages} onChange={e=>setPrivacy({...privacy,messages:e.target.value})}><option>Connections and project members</option><option>Connections only</option><option>No one</option></select></label><div className="safety-panel"><ShieldCheck size={18}/><span><strong>Safety controls</strong><small>Review blocked people or report behaviour to the moderation team.</small></span><button>Manage</button></div></div>}
    </div>;
  }
  return <div className="subpage settings-page"><div className="subpage-head compact"><div><span className="eyebrow">YOUR SPACE</span><h1>Settings</h1><p>Control how the network works for you.</p></div></div><div className="settings-group"><div className="settings-label">MATCHING</div><div className="settings-row"><span><i><N2Mark/></i><span><strong>Smart project recommendations</strong><small>Use skills, interests and activity to find relevant projects.</small></span></span>{toggle(recommendations,()=>setRecommendations(!recommendations),"Toggle smart recommendations")}</div><div className="settings-row"><span><i><UserPlus size={14}/></i><span><strong>Show that I’m available</strong><small>Let project owners know you’re open to relevant asks.</small></span></span>{toggle(availability,()=>setAvailability(!availability),"Toggle availability")}</div></div><div className="settings-group"><div className="settings-label">ACCOUNT & CONNECTIONS</div>{[["profile","Profile and expertise"],["notifications","Messages and notifications"],["calendar","Calendar connections"],["privacy","Privacy and visibility"]].map(([id,label],i)=><button key={id} onClick={()=>setPanel(id as typeof panel)}><span><i>{i+1}</i><strong>{label}</strong></span><ArrowUpRight size={17}/></button>)}</div><div className="settings-footnote"><ShieldCheck size={16}/><span><strong>Your choices stay yours.</strong><small>Privacy and matching settings can be changed at any time.</small></span></div></div>;
}

export default function HomePage() {
  const [view, setView] = useState<View>("feed");
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hasNewProject, setHasNewProject] = useState(false);
  const [toast, setToast] = useState("");
  const [connections, setConnections] = useState<string[]>([]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(""),3200);return()=>clearTimeout(timer)},[toast]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setSearchOpen(true)}if(event.key==="Escape"){setSearchOpen(false);setMatchOpen(false)}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key)},[]);
  function go(next: View){ setView(next); setMenuOpen(false); window.scrollTo({top:0,behavior:"smooth"}); }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div><Logo onClick={()=>go("feed")} /><nav>{nav.map((item) => { const Icon=item.icon; return <button key={item.id} className={view===item.id?"active":""} onClick={()=>go(item.id)}><Icon size={20}/><span>{item.label}</span>{item.count&&<b>{item.count}</b>}</button>})}</nav></div>
        <div className="sidebar-bottom"><button onClick={()=>go("settings")} className={view==="settings"?"active":""}><Settings size={20}/><span>Settings</span></button><button onClick={()=>setToast("Help centre is coming next.")}><CircleHelp size={20}/><span>Help</span></button><button onClick={()=>signOut({redirectTo:"/signin"})}><LogOut size={20}/><span>Log out</span></button><button className="profile-chip" onClick={()=>go("profile")}><Avatar person={people.maya} size="sm"/><span><strong>Maya Chen</strong><small>View profile</small></span><ChevronDown size={16}/></button></div>
      </aside>
      <main className="main-content">
        <button className="mobile-menu" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Open navigation">{menuOpen?<ArrowLeft/>:<Menu/>}</button>
        <div className="content-column">
          {view==="feed"&&<Feed onCreate={()=>setCreateOpen(true)} onMatch={()=>setMatchOpen(true)} onMessage={()=>go("messages")}/>} 
          {view==="projects"&&<ProjectsView onCreate={()=>setCreateOpen(true)} hasNewProject={hasNewProject}/>} 
          {view==="messages"&&<MessagesView/>} 
          {view==="meet"&&<MeetView/>} 
          {view==="profile"&&<ProfileView/>} 
          {view==="settings"&&<SettingsView/>}
        </div>
      </main>
      <aside className="right-rail">
        <div className="rail-top"><button className="search-button" onClick={()=>setSearchOpen(true)}><Search size={18}/><span>Search people & projects</span><kbd>⌘K</kbd></button><button className="icon-button border" onClick={()=>setToast("You have 2 new project matches.")}><Bell size={19}/><i/></button></div>
        <section className="rail-card"><div className="rail-title"><span>PEOPLE TO KNOW</span><button onClick={()=>setSearchOpen(true)}>See all</button></div>{[people.lena,people.dev,people.sofia].map((p,i)=><div className="person-suggest" key={p.name}><Avatar person={p} size="md"/><div><strong>{p.name}</strong><span>{p.role}</span><small>{i===0?"3 shared interests":i===1?"2 mutual projects":"Near you"}</small></div><button className={connections.includes(p.name)?"connected":""} aria-label={`Connect with ${p.name}`} onClick={()=>{setConnections(c=>c.includes(p.name)?c.filter(n=>n!==p.name):[...c,p.name]);setToast(connections.includes(p.name)?`Removed ${p.name}`:`Connection request sent to ${p.name}`)}}>{connections.includes(p.name)?<Check size={17}/>:<Plus size={17}/>}</button></div>)}</section>
        <section className="rail-card pulse-card"><div className="pulse-head"><span>NETWORK PULSE</span><i>LIVE</i></div><strong>34</strong><p>new connections made this week.</p><div className="pulse-bar"><span/></div><small>12% more than last week</small></section>
        <footer><Logo/><p>Useful people, brought together.</p><div><button>About</button><button>Privacy</button><button>Community</button></div><small>© 2026 nice 2 network</small></footer>
      </aside>
      <nav className="mobile-nav">{nav.slice(0,4).map((item)=>{const Icon=item.icon;return <button key={item.id} className={view===item.id?"active":""} onClick={()=>go(item.id)}><Icon size={21}/><span>{item.label}</span></button>})}<button onClick={()=>go("profile")} className={view==="profile"?"active":""}><UserRound size={21}/><span>Me</span></button></nav>
      {createOpen&&<CreateProject onClose={()=>setCreateOpen(false)} onPublish={()=>{setHasNewProject(true);setToast("Project published — we’re finding useful people now.");go("projects")}}/>} 
      {matchOpen&&<MatchPanel onClose={()=>setMatchOpen(false)} onMessage={()=>{setMatchOpen(false);go("messages")}}/>}
      {searchOpen&&<SearchOverlay onClose={()=>setSearchOpen(false)} onNavigate={go}/>} 
      {toast&&<div className="toast"><Check size={16}/>{toast}</div>}
    </div>
  );
}
