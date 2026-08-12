"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Ellipsis,
  Eye,
  Home,
  Lightbulb,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";

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
  return <img className={`avatar avatar-${size} ${ring ? "avatar-ring" : ""}`} src={person.img} alt={person.name} />;
}

function Logo() {
  return (
    <button className="logo" aria-label="Nice 2 Network home">
      <span className="logo-mark">n2</span>
      <span>nice 2 network</span>
    </button>
  );
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

function InterestButton({ initial = 24 }: { initial?: number }) {
  const [watched, setWatched] = useState(false);
  return (
    <button className={`interest-btn ${watched ? "active" : ""}`} onClick={() => setWatched(!watched)} aria-pressed={watched}>
      <Eye size={18} />
      <span>{watched ? initial + 1 : initial} eyes</span>
    </button>
  );
}

function ProjectCard({ second = false }: { second?: boolean }) {
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
          <div className="ai-icon"><Sparkles size={16} /></div>
          <div>
            <strong>One useful connection</strong>
            <p>{second ? "A finance lead could turn this into a sustainable local model." : "A growth lead with community launch experience would round out this team."}</p>
          </div>
          <button>See match <ArrowUpRight size={15} /></button>
        </div>
        <div className="post-actions">
          <InterestButton initial={second ? 41 : 24} />
          <button><MessageCircle size={18} /> {second ? 12 : 8}</button>
          <button className="share-button"><Send size={17} /> Share</button>
        </div>
      </div>
    </article>
  );
}

function CreateProject({ onClose }: { onClose: () => void }) {
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
            <textarea autoFocus placeholder="Describe the idea, why it matters, and where you'd like help…" defaultValue="A Saturday workshop where young people repair and customise old clothes with local designers." />
            <div className="field-row">
              <label>Stage<select defaultValue="Idea"><option>Idea</option><option>Planning</option><option>Building</option></select></label>
              <label>Industry<select defaultValue="Community"><option>Community</option><option>Technology</option><option>Climate</option><option>Creative</option></select></label>
            </div>
            <button className="primary-button wide" onClick={() => setStep(1)}>Find the gaps <Sparkles size={17} /></button>
          </div>
        ) : (
          <div className="modal-content ai-result">
            <div className="ai-orbit"><Sparkles size={24} /><span>AI project map</span></div>
            <h2 id="modal-title">A strong start needs three perspectives.</h2>
            <p>Based on your idea, we’ll recommend it to people in these areas.</p>
            <div className="role-list">
              {["Fashion designer", "Youth facilitator", "Venue partner"].map((role, i) => <div key={role}><span>{i + 1}</span><strong>{role}</strong><Check size={18} /></div>)}
            </div>
            <button className="primary-button wide" onClick={onClose}>Publish project <ArrowUpRight size={17} /></button>
          </div>
        )}
      </section>
    </div>
  );
}

function Feed({ onCreate }: { onCreate: () => void }) {
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
      <section className="composer" onClick={onCreate}>
        <Avatar person={people.maya} size="md" />
        <button>Share an idea that needs good people…</button>
        <span><Lightbulb size={18} /></span>
      </section>
      <div className="feed-filter">
        <button className="active">For you</button><button>Following</button><button>Newest</button>
      </div>
      <ProjectCard />
      <article className="connection-card">
        <div className="connection-copy"><span className="eyebrow">WORTH MEETING</span><h3>You and Lena both care about purposeful brands.</h3><p>She’s looking to meet product designers working on climate and public good.</p><button>View Lena’s profile <ArrowUpRight size={16} /></button></div>
        <Avatar person={people.lena} size="xl" ring />
      </article>
      <ProjectCard second />
      <div className="end-note"><span>n2</span><p>You’re all caught up for now.</p></div>
    </>
  );
}

function ProjectsView({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="subpage">
      <div className="subpage-head"><div><span className="eyebrow">YOUR WORK</span><h1>Projects</h1><p>The ideas you started and the ones you’re helping grow.</p></div><button className="primary-button" onClick={onCreate}><Plus size={18} /> New project</button></div>
      <div className="stats-row"><div><strong>02</strong><span>Created</span></div><div><strong>04</strong><span>Involved</span></div><div><strong>128</strong><span>Eyes placed</span></div></div>
      <div className="section-title"><h3>In motion</h3><button>View all <ArrowUpRight size={15} /></button></div>
      <ProjectCard />
    </div>
  );
}

function MessagesView() {
  return (
    <div className="subpage messages-page">
      <div className="subpage-head compact"><div><span className="eyebrow">CONVERSATIONS</span><h1>Messages</h1></div><button className="icon-button border"><Plus size={20} /></button></div>
      <div className="message-search"><Search size={18} /><input placeholder="Search conversations" /></div>
      <div className="message-list">
        {[people.marcus, people.lena, people.sofia, people.dev].map((person, i) => <button className={i === 0 ? "unread" : ""} key={person.name}><Avatar person={person} size="md" /><span><strong>{person.name}</strong><small>{i === 0 ? "That intro would be brilliant, thank you." : i === 1 ? "See you at Thursday’s meet." : "Shared a project with you"}</small></span><time>{i === 0 ? "10:42" : i === 1 ? "Mon" : "Fri"}</time></button>)}
      </div>
    </div>
  );
}

function MeetView() {
  return (
    <div className="subpage">
      <div className="subpage-head"><div><span className="eyebrow">AUGUST 2026</span><h1>Meet</h1><p>Small rooms, useful conversations.</p></div><button className="primary-button"><Plus size={18} /> Add a meet</button></div>
      <div className="calendar-strip">{[["TUE","12"],["WED","13"],["THU","14"],["FRI","15"],["SAT","16"]].map(([d,n],i)=><button className={i===0?"active":""} key={n}><span>{d}</span><strong>{n}</strong>{i===2&&<i/>}</button>)}</div>
      <div className="section-title"><h3>Today</h3><span>2 meets</span></div>
      <div className="meet-card"><div className="meet-time"><strong>12:30</strong><span>45 min</span></div><div><span className="tag">TEAMS</span><h3>Clean energy pilot: first working session</h3><p>Marcus, Dev, Ali and you</p><div className="mini-stack"><Avatar person={people.marcus} size="sm"/><Avatar person={people.dev} size="sm"/><Avatar person={people.ali} size="sm"/></div></div><button className="join-button">Join</button></div>
      <div className="meet-card"><div className="meet-time"><strong>17:00</strong><span>In person</span></div><div><span className="tag dark">NETWORK</span><h3>Creative collisions · Shoreditch</h3><p>18 people from design, food, tech and culture</p></div><button className="icon-button border"><ArrowUpRight size={18}/></button></div>
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

function SettingsView() {
  return <div className="subpage settings-page"><div className="subpage-head compact"><div><span className="eyebrow">YOUR SPACE</span><h1>Settings</h1></div></div>{["Profile and expertise","Project recommendations","Messages and notifications","Calendar connections","Privacy and visibility"].map((s,i)=><button key={s}><span><i>{i+1}</i><strong>{s}</strong></span><ArrowUpRight size={17}/></button>)}</div>;
}

export default function HomePage() {
  const [view, setView] = useState<View>("feed");
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div><Logo /><nav>{nav.map((item) => { const Icon=item.icon; return <button key={item.id} className={view===item.id?"active":""} onClick={()=>{setView(item.id);setMenuOpen(false)}}><Icon size={20}/><span>{item.label}</span>{item.count&&<b>{item.count}</b>}</button>})}</nav></div>
        <div className="sidebar-bottom"><button onClick={()=>setView("settings")} className={view==="settings"?"active":""}><Settings size={20}/><span>Settings</span></button><button><CircleHelp size={20}/><span>Help</span></button><button className="profile-chip" onClick={()=>setView("profile")}><Avatar person={people.maya} size="sm"/><span><strong>Maya Chen</strong><small>View profile</small></span><ChevronDown size={16}/></button></div>
      </aside>
      <main className="main-content">
        <button className="mobile-menu" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Open navigation">{menuOpen?<ArrowLeft/>:<Menu/>}</button>
        <div className="content-column">
          {view==="feed"&&<Feed onCreate={()=>setCreateOpen(true)}/>} 
          {view==="projects"&&<ProjectsView onCreate={()=>setCreateOpen(true)}/>} 
          {view==="messages"&&<MessagesView/>} 
          {view==="meet"&&<MeetView/>} 
          {view==="profile"&&<ProfileView/>} 
          {view==="settings"&&<SettingsView/>}
        </div>
      </main>
      <aside className="right-rail">
        <div className="rail-top"><button className="search-button"><Search size={18}/><span>Search people & projects</span><kbd>⌘K</kbd></button><button className="icon-button border"><Bell size={19}/><i/></button></div>
        <section className="rail-card"><div className="rail-title"><span>PEOPLE TO KNOW</span><button>See all</button></div>{[people.lena,people.dev,people.sofia].map((p,i)=><div className="person-suggest" key={p.name}><Avatar person={p} size="md"/><div><strong>{p.name}</strong><span>{p.role}</span><small>{i===0?"3 shared interests":i===1?"2 mutual projects":"Near you"}</small></div><button aria-label={`Connect with ${p.name}`}><Plus size={17}/></button></div>)}</section>
        <section className="rail-card pulse-card"><div className="pulse-head"><span>NETWORK PULSE</span><i>LIVE</i></div><strong>34</strong><p>new connections made this week.</p><div className="pulse-bar"><span/></div><small>12% more than last week</small></section>
        <footer><Logo/><p>Useful people, brought together.</p><div><button>About</button><button>Privacy</button><button>Community</button></div><small>© 2026 nice 2 network</small></footer>
      </aside>
      <nav className="mobile-nav">{nav.slice(0,4).map((item)=>{const Icon=item.icon;return <button key={item.id} className={view===item.id?"active":""} onClick={()=>setView(item.id)}><Icon size={21}/><span>{item.label}</span></button>})}<button onClick={()=>setView("profile")} className={view==="profile"?"active":""}><UserRound size={21}/><span>Me</span></button></nav>
      {createOpen&&<CreateProject onClose={()=>setCreateOpen(false)}/>} 
    </div>
  );
}
