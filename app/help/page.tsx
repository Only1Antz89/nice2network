import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SupportRequestForm from "@/components/support-request-form";

export default function HelpPage() {
  return <main className="recovery-page support-page">
    <Link className="recovery-logo" href="/"><span>n2</span>nice 2 network</Link>
    <section className="recovery-card support-card">
      <span className="eyebrow">N2 SUPPORT</span>
      <h1>How can we help?</h1>
      <p>Tell us what you’re having trouble with. Your request will go to the private admin inbox for review and we’ll reply by email.</p>
      <SupportRequestForm/>
      <Link className="recovery-text-link" href="/signin"><ArrowLeft size={14}/> Back to sign in</Link>
    </section>
  </main>;
}
