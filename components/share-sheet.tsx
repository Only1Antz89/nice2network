"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Ellipsis,
  Link2,
  Mail,
  MessageCircle,
  Send,
  Share2,
  UsersRound,
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
    kind?: "project" | "post";
  };
  authenticated: boolean;
  onRequireAuth: () => void;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const kind = item.kind ?? "project",
    url =
      typeof window !== "undefined"
        ? `${window.location.origin}/share/${kind}/${item.id}`
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
        body: `Shared from the n2 timeline: ${item.title}\n${item.summary}\n${url}`,
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
                      <MessageCircle size={16} />
                      WhatsApp
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track("linkedin")}
                    >
                      <UsersRound size={16} />
                      LinkedIn
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track("facebook")}
                    >
                      <UsersRound size={16} />
                      Facebook
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track("x")}
                    >
                      <Share2 size={16} />X
                    </a>
                    <a
                      href={`https://t.me/share/url?url=${encoded}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track("telegram")}
                    >
                      <Send size={16} />
                      Telegram
                    </a>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(item.title)}&body=${encoded}`}
                      onClick={() => track("email")}
                    >
                      <Mail size={16} />
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
