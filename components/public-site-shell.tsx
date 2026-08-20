import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

const navigation = [
  ["/about", "About"],
  ["/community", "Community"],
  ["/privacy", "Privacy"],
  ["/terms", "Terms"],
] as const;

export function PublicSiteShell({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "noir" }) {
  return (
    <div className={`public-site public-site--${tone}`}>
      <header className="public-header">
        <Link className="public-brand" href="/" aria-label="nice 2 network home"><span>n2</span><strong>nice 2 network</strong></Link>
        <nav aria-label="Public pages">{navigation.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}</nav>
        <Link className="public-join" href="/signin?mode=register">Join the network <ArrowUpRight size={13} strokeWidth={1.8} aria-hidden="true" /></Link>
      </header>
      {children}
      <footer className="public-footer">
        <div><Link className="public-brand" href="/"><span>n2</span><strong>nice 2 network</strong></Link><p>Connect, create and support each other.</p></div>
        <nav aria-label="Footer links">{navigation.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}</nav>
        <div className="public-credit">
          <small>© 2026 nice 2 network</small>
          <small>
            built by{" "}
            <a className="intaillium-credit" data-wordmark="IntAillium" href="https://intaillium.com" target="_blank" rel="noreferrer">
              IntAillium
            </a>
          </small>
        </div>
      </footer>
    </div>
  );
}

export function LegalPage({ eyebrow, title, summary, children }: { eyebrow: string; title: string; summary: string; children: ReactNode }) {
  return (
    <PublicSiteShell>
      <main className="legal-page">
        <header className="legal-hero"><span>{eyebrow}</span><h1>{title}</h1><p>{summary}</p><small>Effective 17 August 2026</small></header>
        <article className="legal-copy">{children}</article>
      </main>
    </PublicSiteShell>
  );
}
