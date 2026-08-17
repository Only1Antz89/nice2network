import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { privacySettings, users } from "@/db/schema";
import { Avatar } from "@/components/network-brand";
import { PublicSiteShell } from "@/components/public-site-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "About — nice 2 network",
  description: "Why nice 2 network exists, how it works, and the people behind it.",
};

type Founder = { id: string; name: string | null; profession: string | null; headline: string | null; bio: string | null; image: string | null; city: string | null; country: string | null; skills: string[] };

async function getFounders(): Promise<Founder[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    return await getDb().select({ id: users.id, name: users.name, profession: users.profession, headline: users.headline, bio: users.bio, image: users.image, city: users.city, country: users.country, skills: users.skills })
      .from(users)
      .innerJoin(privacySettings, eq(privacySettings.userId, users.id))
      .where(and(eq(users.role, "founder"), eq(users.status, "active"), eq(privacySettings.profileVisibility, "public")));
  } catch { return []; }
}

export default async function AboutPage() {
  const founders = await getFounders();
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
            <span className="system-node system-owner">YOU<small>OWNER</small></span>
            <i className="system-line line-a"/><i className="system-line line-b"/><i className="system-line line-c"/><i className="system-line line-d"/>
            <span className="system-node node-a">DESIGN</span><span className="system-node node-b">BUILD</span><span className="system-node node-c">COMMUNITY</span><span className="system-node node-d open">OPEN ROLE</span>
          </div>
        </section>

        <section className="founders-section">
          <header><span className="about-index">04 / FOUNDERS</span><h2>The people behind<br/>the network.</h2><p>The founding profiles come from the same network they are building.</p></header>
          <div className="founder-grid">
            {founders.length ? founders.map((founder, index) => (
              <article className="founder-card" key={founder.id}>
                <div className="founder-number">0{index + 1}</div>
                <Avatar person={{ name: founder.name ?? "n2 founder", role: founder.profession ?? "Founder", img: founder.image }} size="xl"/>
                <div><span>N2 FOUNDER</span><h3>{founder.name ?? "n2 founder"}</h3><strong>{founder.headline ?? founder.profession ?? "Building useful networks"}</strong><p>{founder.bio ?? "Building a more useful way for people and ideas to find one another."}</p>{founder.skills.length > 0 && <small>{founder.skills.slice(0, 3).join(" · ")}</small>}</div>
              </article>
            )) : (
              <article className="founder-card founder-studio">
                <div className="founder-number">01</div><div className="studio-mark">IA</div>
                <div><span>FOUNDING STUDIO</span><h3>IntAillium</h3><strong>Product, systems and the intelligence between them.</strong><p>IntAillium built nice 2 network around one practical belief: technology should make human collaboration clearer, warmer and more useful.</p><small>STRATEGY · DESIGN · ENGINEERING</small></div>
              </article>
            )}
          </div>
        </section>

        <section className="about-cta"><span>THE NEXT USEFUL PERSON</span><h2>might already be here.</h2><div><Link href="/signin?mode=register">Join nice 2 network ↗</Link><Link href="/community">Read our community code</Link></div></section>
      </main>
    </PublicSiteShell>
  );
}
