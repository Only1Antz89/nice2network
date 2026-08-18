"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Ellipsis,
  Link2,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";
import { N2Mark } from "@/components/network-brand";
import shareStyles from "./share-sheet.module.css";

type ShareConversation = {
  id: string;
  name: string | null;
  members: Array<{ name: string | null }>;
  lastMessage?: { body: string } | null;
};

type ShareProject = {
  id: string;
  title: string;
  industry: string;
  stage: string;
  status?: string;
};

type SocialBrand = "whatsapp" | "linkedin" | "facebook" | "x" | "telegram" | "email";

function SocialBrandIcon({ brand }: { brand: SocialBrand }) {
  return <span className={`${shareStyles.brandIcon} ${shareStyles[brand]}`} aria-hidden="true">
    {brand === "whatsapp" && <svg viewBox="0 0 24 24"><path d="M20 11.7a8 8 0 0 1-11.8 7L4 20l1.3-4A8 8 0 1 1 20 11.7Z"/><path d="M9 8.2c.2-.4.5-.4.8-.4l.6 1.7c.1.3 0 .5-.2.7l-.5.5c.7 1.4 1.7 2.4 3.2 3.1l.5-.7c.2-.2.4-.3.7-.2l1.7.8c.2.1.3.3.3.6 0 1.1-.9 2-2.1 2-3.5-.2-6.3-3-6.5-6.5 0-.6.4-1.2 1.5-1.6Z"/></svg>}
    {brand === "linkedin" && <svg viewBox="0 0 24 24"><path d="M6.2 8.2H3.4V21h2.8V8.2ZM4.8 3A1.8 1.8 0 1 0 4.8 6.6 1.8 1.8 0 0 0 4.8 3ZM20.6 13.7c0-3.9-4.5-4.2-6.1-2.1V8.2h-2.8V21h2.8v-6.5c0-2.3 3.3-2.5 3.3 0V21h2.8v-7.3Z"/></svg>}
    {brand === "facebook" && <svg viewBox="0 0 24 24"><path d="M14.1 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.8-.1-1.7-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.3v2.2H8V13h2.7v8h3.4Z"/></svg>}
    {brand === "x" && <svg viewBox="0 0 24 24"><path d="M4 4h4.7l3.9 5.2L17.2 4H20l-6.1 7.1L20.5 20h-4.7l-4.2-5.6L6.8 20H4l6.3-7.5L4 4Zm3.6 2 9.2 12h1.6L9.2 6H7.6Z"/></svg>}
    {brand === "telegram" && <svg viewBox="0 0 24 24"><path d="m20.7 4.2-3 15c-.2 1-1 1.2-1.8.7l-4.6-3.4-2.2 2.1c-.2.3-.5.5-.9.5l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L5.9 13.1l-4.6-1.4c-1-.3-1-1 .2-1.5l17.9-6.9c.8-.3 1.6.2 1.3.9Z"/></svg>}
    {brand === "email" && <svg viewBox="0 0 24 24"><path className={shareStyles.gmailBlue} d="M3 6.3 6 8.6V19H3V6.3Z"/><path className={shareStyles.gmailRed} d="M21 6.3 18 8.6V19h3V6.3Z"/><path className={shareStyles.gmailYellow} d="M3.8 5.2c.6-.5 1.5-.5 2.2 0l6 4.5 6-4.5c.7-.5 1.6-.5 2.2 0L18 8.6l-6 4.5-6-4.5-2.2-3.4Z"/><path className={shareStyles.gmailGreen} d="M6 8.6 12 13v3.5L6 12V8.6Z"/><path className={shareStyles.gmailRed} d="m18 8.6-6 4.5v3.5l6-4.6V8.6Z"/></svg>}
  </span>;
}

export default function ShareSheet({
  item,
  authenticated,
  onRequireAuth,
  onClose,
  onToast,
}: {
  item: {
    id: string;
    title: string;
    summary: string;
    kind?: "project" | "post" | "profile";
    sharePath?: string;
  };
  authenticated: boolean;
  onRequireAuth: () => void;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const kind = item.kind ?? "project",
    url =
      typeof window !== "undefined"
        ? `${window.location.origin}${item.sharePath ?? `/share/${kind}/${item.id}`}`
        : "";
  const encoded = encodeURIComponent(url);
  const [panel, setPanel] = useState<"main" | "messages" | "projects">("main"),
    [more, setMore] = useState(true),
    [busy, setBusy] = useState(""),
    [conversations, setConversations] = useState<ShareConversation[]>([]),
    [projects, setProjects] = useState<ShareProject[]>([]);
  useEffect(() => {
    if (!authenticated) return;
    Promise.all([
      fetch("/api/conversations").then((r) =>
        r.ok ? r.json() : { conversations: [] },
      ),
      fetch("/api/projects?scope=mine&limit=50").then((r) =>
        r.ok ? r.json() : { projects: [] },
      ),
    ])
      .then(([chats, work]) => {
        setConversations(chats.conversations ?? []);
        setProjects(
          (work.projects ?? []).filter(
            (project: ShareProject) =>
              project.status === "active" && project.id !== item.id,
          ),
        );
      })
      .catch(() => undefined);
  }, [authenticated, item.id]);
  function track(channel: string) {
    if (kind === "project")
      fetch(`/api/projects/${item.id}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel }),
      }).catch(() => undefined);
  }
  function requireAccess(next: "messages" | "projects") {
    if (!authenticated) {
      onClose();
      onRequireAuth();
      return;
    }
    setPanel(next);
  }
  async function copy() {
    await navigator.clipboard.writeText(url);
    track("copy");
    onToast("Link copied.");
    onClose();
  }
  async function nativeShare() {
    if (navigator.share) {
      await navigator.share({ title: item.title, url });
      track("native");
      onClose();
    } else await copy();
  }
  async function sendToConversation(conversation: ShareConversation) {
    setBusy(conversation.id);
    const response = await fetch(
      `/api/conversations/${conversation.id}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: `${item.title}\n${item.summary}\n${url}`,
        }),
      },
    );
    setBusy("");
    if (response.ok) {
      track("n2_message");
      onToast("Shared in messages.");
      onClose();
    } else onToast("Could not share to this conversation.");
  }
  async function sendToProject(project: ShareProject) {
    setBusy(project.id);
    const response = await fetch(`/api/projects/${project.id}/updates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "update",
        body: `Shared from n2: ${item.title}\n${item.summary}\n${url}`,
      }),
    });
    setBusy("");
    if (response.ok) {
      track("n2_project");
      onToast(`Shared to ${project.title}.`);
      onClose();
    } else onToast("Join this project before sharing to its updates.");
  }
  const conversationTitle = (row: ShareConversation) =>
    row.name ||
    row.members
      .map((member) => member.name)
      .filter(Boolean)
      .join(", ") ||
    "Conversation";
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="share-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${item.title}`}
      >
        <header>
          <div>
            {panel !== "main" && (
              <button className="share-back" onClick={() => setPanel("main")}>
                <ArrowLeft size={15} /> Back
              </button>
            )}
            <span className="eyebrow">BRING IN USEFUL PEOPLE</span>
            <h2>
              {panel === "messages"
                ? "Share in messages"
                : panel === "projects"
                  ? "Share to a project"
                  : `Share this ${kind}`}
            </h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close share dialog" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        <div className="share-project">
          <N2Mark />
          <span>
            <strong>{item.title}</strong>
            <small>{item.summary}</small>
          </span>
        </div>
        {panel === "main" ? (
          <>
            <div className="share-primary">
              <button onClick={() => requireAccess("messages")}>
                <MessageCircle size={20} />
                <span>
                  <strong>Send in messages</strong>
                  <small>Choose an n2 conversation</small>
                </span>
              </button>
              <button onClick={() => requireAccess("projects")}>
                <BriefcaseBusiness size={20} />
                <span>
                  <strong>Share to a project</strong>
                  <small>Add it to project updates</small>
                </span>
              </button>
              <button onClick={copy}>
                <Link2 size={20} />
                <span>
                  <strong>Copy link</strong>
                  <small>Includes a rich preview</small>
                </span>
              </button>
              <div className="share-more-wrap">
                <button
                  aria-label="More sharing options"
                  aria-expanded={more}
                  onClick={() => setMore((value) => !value)}
                >
                  <Ellipsis size={21} />
                  <span>
                    <strong>More</strong>
                    <small>External sharing options</small>
                  </span>
                </button>
                {more && (
                  <div className={`share-more-menu ${shareStyles.socialShare}`}>
                    <button onClick={nativeShare}>
                      <Share2 size={16} />
                      Device share
                    </button>
                    <a
                      href={`https://wa.me/?text=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track("whatsapp")}
                    >
                      <SocialBrandIcon brand="whatsapp" />
                      WhatsApp
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track("linkedin")}
                    >
                      <SocialBrandIcon brand="linkedin" />
                      LinkedIn
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track("facebook")}
                    >
                      <SocialBrandIcon brand="facebook" />
                      Facebook
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track("x")}
                    >
                      <SocialBrandIcon brand="x" />X
                    </a>
                    <a
                      href={`https://t.me/share/url?url=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track("telegram")}
                    >
                      <SocialBrandIcon brand="telegram" />
                      Telegram
                    </a>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(item.title)}&body=${encoded}`}
                      onClick={() => track("email")}
                    >
                      <SocialBrandIcon brand="email" />
                      Email
                    </a>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="share-destination-list">
            {panel === "messages"
              ? conversations.map((row) => (
                  <button
                    key={row.id}
                    disabled={busy === row.id}
                    onClick={() => sendToConversation(row)}
                  >
                    <MessageCircle size={18} />
                    <span>
                      <strong>{conversationTitle(row)}</strong>
                      <small>
                        {row.lastMessage?.body ??
                          "Start the conversation with this share"}
                      </small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))
              : projects.map((project) => (
                  <button
                    key={project.id}
                    disabled={busy === project.id}
                    onClick={() => sendToProject(project)}
                  >
                    <BriefcaseBusiness size={18} />
                    <span>
                      <strong>{project.title}</strong>
                      <small>
                        {project.industry} · {project.stage}
                      </small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
            {panel === "messages" && !conversations.length && (
              <p>No conversations yet. Start one in Messages first.</p>
            )}
            {panel === "projects" && !projects.length && (
              <p>No eligible projects yet. Create or join a project first.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
