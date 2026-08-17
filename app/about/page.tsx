import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PublicSiteShell } from "@/components/public-site-shell";

export const metadata: Metadata = {
  title: "About — nice 2 network",
  description: "Why nice 2 network exists, how it works, and the people behind it.",
};

const founders = [
  {
    name: "Phillip Joseph",
    role: "Leadership and management",
    focus: "People, purpose and possibility",
    image: "/founders/phillip-joseph-founder-v2.png",
    bio: "Phillip works where leadership, education and social mobility meet. Across mainstream and alternative provision, he has built his career around improving outcomes for young people who have too often been overlooked. At nice 2 network, he keeps the human purpose in view: creating genuine routes to confidence, capability and community leadership.",
  },
  {
    name: "Nathan Baiden",
    role: "Business and regulatory analysis",
    focus: "Clarity, structure and forward motion",
    image: "/founders/nathan-baiden-founder-v2.png",
    bio: "Nathan brings more than nine years of financial-services experience to the founding team. His work in regulatory change and complex delivery has taught him how to turn ambiguity into a route forward. For nice 2 network, that means giving promising ideas the structure, momentum and practical thinking they need to become real projects.",
  },
  {
    name: "Nicholas Wright",
    role: "Operations and performance",
    focus: "Potential, performance and execution",
    image: "/founders/nicholas-wright-founder-v1.png",
    bio: "Nicholas brings an operator’s discipline and a coach’s belief in human potential. After more than five years in professional football coaching, he moved into operations without leaving that performance mindset behind. His role in the founding vision is to help people move beyond intent—towards contribution, progress and their best work.",
  },
] as const;

function FounderProfile({ founder, index }: { founder: (typeof founders)[number]; index: number }) {
  return (
    <article className="founder-card">
      <div className="founder-portrait"><Image src={founder.image} alt={`Editorial representation of ${founder.name}`} fill sizes="(max-width: 800px) 100vw, 48vw" /></div>
      <div className="founder-copy"><div className="founder-meta"><span>0{index + 1} / N2 FOUNDER</span><small>{founder.role}</small></div><h3>{founder.name}</h3><strong>{founder.focus}</strong><p>{founder.bio}</p></div>
    </article>
  );
}

function BuildPartnerProfile() {
  return (
    <article className="founder-card founder-card--partner">
      <Link
        className="founder-portrait founder-portrait--partner"
        href="https://www.intaillium.com/"
        target="_blank"
        rel="noreferrer"
        aria-label="Visit IntAillium"
      >
        <Image src="/brand/intaillium-wordmark.png" alt="IntAillium" fill sizes="(max-width: 800px) 100vw, 48vw" />
      </Link>
      <div className="founder-copy">
        <div className="founder-meta"><span>04 / BUILD PARTNER</span><small>Product · Design · Engineering</small></div>
        <h3><Link href="https://www.intaillium.com/" target="_blank" rel="noreferrer">IntAillium</Link></h3>
        <strong>Turning the founders’ vision into a working network.</strong>
        <p>IntAillium works alongside Phillip, Nathan and Nicholas as nice 2 network’s build partner. The studio brings product strategy, design, engineering and systems thinking to the founders’ purpose—translating their ambition for more useful human connection into a platform people can actually use.</p>
        <Link className="partner-profile-link" href="https://www.intaillium.com/" target="_blank" rel="noreferrer">Visit IntAillium <ArrowUpRight size={13} aria-hidden="true" /></Link>
      </div>
    </article>
  );
}

export default function AboutPage() {
  return (
    <PublicSiteShell tone="noir">
      <main className="about-page">
        <section className="about-hero">
          <div className="about-issue">N2 / ABOUT / 2026</div>
          <div className="about-orbit" aria-hidden="true"><i/><i/><i/><i/><span>n2</span></div>
          <div className="about-hero-copy">
            <p>Ideas rarely fail for lack of possibility.</p>
            <h1>They need the<br/><em>right people.</em></h1>
            <div><span>01</span><p>nice 2 network is a place to discover useful people, shape practical projects and build the team an idea actually needs.</p></div>
          </div>
          <small className="about-scroll">SCROLL TO MEET THE NETWORK ↓</small>
        </section>

        <section className="about-purpose">
          <span className="about-index">02 / PURPOSE</span>
          <blockquote>“A network should do more than count connections. It should help something happen.”</blockquote>
          <div className="purpose-grid">
            <article><b>01</b><h2>Find signal</h2><p>People and projects surface through skills, interests, industry and the work already happening around you.</p></article>
            <article><b>02</b><h2>See the gaps</h2><p>Project maps make owners, contributors, departments and open roles visible—so the next useful move is clear.</p></article>
            <article><b>03</b><h2>Make contact useful</h2><p>Explainable recommendations, warm paths, focused messages and meetings turn discovery into contribution.</p></article>
          </div>
        </section>

        <section className="about-system">
          <div><span className="about-index">03 / THE SYSTEM</span><h2>From a loose idea<br/>to a working circle.</h2></div>
          <div className="system-diagram" aria-label="A project owner connected to design, engineering, community and an open role">
            <span className="system-status">LIVE NETWORK / 04 CONNECTIONS</span>
            <svg className="system-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <g>
                <line x1="50" y1="50" x2="13" y2="20"/>
                <line x1="50" y1="50" x2="87" y2="17"/>
                <line x1="50" y1="50" x2="16" y2="82"/>
                <line x1="50" y1="50" x2="86" y2="80"/>
              </g>
              <g className="connection-points">
                <circle cx="13" cy="20" r=".65"/><circle cx="87" cy="17" r=".65"/><circle cx="16" cy="82" r=".65"/><circle cx="86" cy="80" r=".65"/>
              </g>
            </svg>
            <span className="system-node system-owner">YOU<small>OWNER</small></span>
            <span className="system-node node-a">DESIGN</span><span className="system-node node-b">BUILD</span><span className="system-node node-c">COMMUNITY</span><span className="system-node node-d open">OPEN ROLE</span>
          </div>
        </section>

        <section className="founders-section">
          <header><span className="about-index">04 / FOUNDERS</span><h2>Three founders.<br/>One useful network.</h2><p>nice 2 network was founded by Phillip Joseph, Nathan Baiden and Nicholas Wright—three perspectives united by a belief in what people can make possible together.</p></header>
          <div className="founder-grid">
            <div className="founder-column"><FounderProfile founder={founders[0]} index={0}/><FounderProfile founder={founders[2]} index={2}/></div>
            <div className="founder-column founder-column--right"><FounderProfile founder={founders[1]} index={1}/><BuildPartnerProfile /></div>
          </div>
        </section>

        <section className="about-cta"><span>THE NEXT USEFUL PERSON</span><h2>might already be here.</h2><div><Link href="/signin?mode=register">Join nice 2 network <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden="true" /></Link><Link href="/community">Read our community code</Link></div></section>
      </main>
    </PublicSiteShell>
  );
}
