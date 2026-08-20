import type { Metadata } from "next";
import Link from "next/link";
import { PublicSiteShell } from "@/components/public-site-shell";

export const metadata: Metadata = { title: "Community — nice 2 network", description: "The principles that keep nice 2 network welcoming, generous and safe." };

const principles = [
  ["01", "Offer support generously", "Bring context, make thoughtful introductions and share what you know. Encouragement and practical help can move an idea forward."],
  ["02", "Treat people as people", "Respect boundaries, lived experience, identity and time. Disagreement is welcome; humiliation, harassment and hate are not."],
  ["03", "Build in the open, safely", "Share enough for others to contribute, but protect confidential information, personal data and work that is not yours to publish."],
  ["04", "Make the invitation honest", "Describe roles, expectations, ownership and compensation clearly. Do not disguise unpaid labour, recruitment or sales as community."],
  ["05", "Give credit where it is due", "Acknowledge ideas, labour and introductions. Agree how work will be used before taking it beyond the project."],
  ["06", "Look after the room", "Report scams, unsafe behaviour or content that puts people at risk. Community care is a shared practice."],
] as const;

export default function CommunityPage() {
  return (
    <PublicSiteShell>
      <main className="community-page">
        <section className="community-hero"><span>THE COMMUNITY CODE</span><h1>Everyone is welcome.<br/><em>Care keeps us connected.</em></h1><p>nice 2 network works when people feel able to join in, share ideas and support one another. These are the standards that keep every interaction welcoming and safe.</p></section>
        <section className="principles-grid">{principles.map(([number, title, copy]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{copy}</p></article>)}</section>
        <section className="community-boundary">
          <div><span>THE LINE</span><h2>What does not belong here.</h2></div>
          <ul><li>Harassment, hate, threats or targeted abuse</li><li>Scams, impersonation or deceptive opportunities</li><li>Sexual exploitation or content that endangers young people</li><li>Spam, coercive promotion or repeated unwanted contact</li><li>Sharing private information without permission</li><li>Plagiarism or taking credit for another person&apos;s work</li></ul>
        </section>
        <section className="community-response"><span>IF SOMETHING GOES WRONG</span><h2>Report it. We will review it.</h2><p>Use the reporting controls on a profile, post, project or message. We may remove content, limit an account or preserve evidence when safety or law requires it. Appeals are available for moderation decisions.</p><Link href="/signin">Open the network →</Link></section>
      </main>
    </PublicSiteShell>
  );
}
