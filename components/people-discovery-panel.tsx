"use client";

import { useEffect, useState } from "react";
import { Plus, Search, UsersRound, X } from "lucide-react";
import ActionDialog from "@/components/action-dialog";
import { Avatar } from "@/components/network-brand";

type PeopleSuggestion = { recommendationId: string; id: string; name: string | null; image: string | null; profession: string | null; location: string | null; reasons: string[] };

export default function PeopleDiscoveryPanel({ onClose, onProfile, onToast, onNetworkChanged }: {
  onClose: () => void;
  onProfile: (id: string) => void;
  onToast: (message: string) => void;
  onNetworkChanged: () => void;
}) {
  const [items, setItems] = useState<PeopleSuggestion[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [feedbackTarget, setFeedbackTarget] = useState<PeopleSuggestion | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "40", filter });
    if (query.trim()) params.set("q", query.trim());
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/people/suggestions?${params}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : { suggestions: [] })
        .then((data) => setItems(data.suggestions ?? []))
        .catch((error) => { if (error instanceof Error && error.name !== "AbortError") onToast("People suggestions could not be loaded."); })
        .finally(() => setLoading(false));
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filter, onToast, query]);

  async function follow(item: PeopleSuggestion) {
    const response = await fetch(`/api/users/${item.id}/follow`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) { onToast(result.error ?? "Could not follow this member."); return; }
    onNetworkChanged();
    setItems((rows) => rows.filter((row) => row.id !== item.id));
    onToast(result.mutual ? `You and ${item.name} are now mutually connected.` : `You’re now following ${item.name}.`);
  }

  async function sendFeedback(item: PeopleSuggestion, signal: "hide" | "not_relevant", reason?: string) {
    const response = await fetch("/api/people/suggestions/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recommendationId: item.recommendationId, signal, reason: reason || undefined }) });
    if (!response.ok) { onToast("Could not update this suggestion."); return false; }
    setItems((rows) => rows.filter((row) => row.id !== item.id));
  }

  return (
    <>
      <div className="panel-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <aside className="people-discovery-panel" role="dialog" aria-modal="true" aria-label="People to connect with">
          <header><div><span className="eyebrow">PEOPLE TO CONNECT WITH</span><h2>Meet your community</h2><p>Discover shared interests, ideas and ways to support each other.</p></div><button className="icon-button" aria-label="Close people suggestions" onClick={onClose}><X size={19} /></button></header>
          <label className="help-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search profession, skill, industry or location" /></label>
          <div className="people-filter-tabs">{[{ value: "all", label: "All" }, { value: "project", label: "Project fit" }, { value: "local", label: "Near you" }].map((item) => <button key={item.value} className={filter === item.value ? "active" : ""} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
          <div className="people-discovery-list">
            {loading ? <p>Finding people to connect with…</p> : items.map((item) => <article key={item.id}><button className="people-profile" onClick={() => { onProfile(item.id); onClose(); }}><Avatar person={{ name: item.name ?? "n2 member", role: item.profession ?? "Member", img: item.image }} size="md" /><span><strong>{item.name ?? "n2 member"}</strong><small>{item.profession ?? "Member"}{item.location ? ` · ${item.location}` : ""}</small><i>{item.reasons.join(" · ")}</i></span></button><div><button className="secondary-button" onClick={() => follow(item)}><Plus size={14} /> Follow</button><button className="icon-button" aria-label="Hide suggestion" onClick={() => sendFeedback(item, "hide")}><X size={14} /></button><button className="text-button" onClick={() => setFeedbackTarget(item)}>Show me someone else</button></div></article>)}
            {!loading && !items.length && <div className="onboarding-empty"><UsersRound size={22} /><strong>Your community is growing</strong><p>Add to your profile or return as more people join.</p></div>}
          </div>
        </aside>
      </div>
      {feedbackTarget && <ActionDialog eyebrow="PERSONALISE YOUR SUGGESTIONS" title={`Why would you like to see someone else?`} description="Optional feedback helps n2 introduce you to people with more shared interests and goals." confirmLabel="Send feedback" fields={[{ name: "reason", label: "Reason (optional)", placeholder: "Tell us what you would like to find", maxLength: 500 }]} onClose={() => setFeedbackTarget(null)} onConfirm={({ reason }) => sendFeedback(feedbackTarget, "not_relevant", reason)} />}
    </>
  );
}
