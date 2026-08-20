"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown, CircleHelp, MessageSquarePlus, Search, ShieldCheck, X } from "lucide-react";
import SupportRequestForm from "@/components/support-request-form";

type HelpDestination = "feed" | "projects" | "messages" | "meet" | "settings";

export default function HelpPanel({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (view: HelpDestination) => void;
}) {
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState<string | null>(null),
    [contactOpen, setContactOpen] = useState(false);
  const topics = [
    {
      id: "projects",
      title: "Starting and joining projects",
      answer:
        "Start a project from Home, review the suggested team map, then publish it. Use Views to follow momentum, comments to discuss the work, and open roles to contribute.",
      view: "projects" as HelpDestination,
      label: "Open projects",
    },
    {
      id: "feed",
      title: "Posts, ideas and project tags",
      answer:
        "Share a post or idea from Home. Add an image, video or video link, then tag one of your projects or any public project so people can move directly from the conversation to the work.",
      view: "feed" as HelpDestination,
      label: "Go to Home",
    },
    {
      id: "messages",
      title: "Messages and group conversations",
      answer:
        "Use Messages for direct or group conversations. Project comments remain attached to the project so the full working context stays together.",
      view: "messages" as HelpDestination,
      label: "Open messages",
    },
    {
      id: "meet",
      title: "Meets and video calls",
      answer:
        "Create an n2 Meet, invite up to four people for a demo video call, or add an in-person session to your calendar.",
      view: "meet" as HelpDestination,
      label: "Open Meet",
    },
    {
      id: "account",
      title: "Profile, privacy and account help",
      answer:
        "Your profile, notification choices, visibility, password and calendar preferences are managed from Settings.",
      view: "settings" as HelpDestination,
      label: "Open settings",
    },
  ];
  const visible = topics.filter((topic) =>
    `${topic.title} ${topic.answer}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <div
      className="panel-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        className="help-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Help centre"
      >
        <header>
          <div>
            <span className="eyebrow">N2 SUPPORT</span>
            <h2>How can we help?</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close help centre" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        <label className="help-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search help"
          />
        </label>
        <div className="help-topics">
          {visible.map((topic) => (
            <article key={topic.id}>
              <button
                onClick={() =>
                  setOpen((current) => (current === topic.id ? null : topic.id))
                }
              >
                <span>{topic.title}</span>
                <ChevronDown size={16} />
              </button>
              {open === topic.id && (
                <div>
                  <p>{topic.answer}</p>
                  <button
                    onClick={() => {
                      onNavigate(topic.view);
                      onClose();
                    }}
                  >
                    {topic.label}
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              )}
            </article>
          ))}
          {!visible.length && (
            <div className="help-empty">
              <CircleHelp size={21} />
              <strong>No matching help article</strong>
              <p>Try “projects”, “messages”, “profile” or “meet”.</p>
            </div>
          )}
        </div>
        <section className="help-contact">
          <button type="button" onClick={() => setContactOpen(value => !value)} aria-expanded={contactOpen}><MessageSquarePlus size={16}/><span><strong>Still need help?</strong><small>Send your issue privately to the n2 support inbox.</small></span><ChevronDown size={16}/></button>
          {contactOpen && <SupportRequestForm compact/>}
        </section>
        <footer>
          <ShieldCheck size={16} />
          <p>
            <strong>Safety concern?</strong>
            <span>
              Use the report option on the relevant project, post or member so
              the n2 team receives the right context.
            </span>
          </p>
        </footer>
      </aside>
    </div>
  );
}
