"use client";

import Image from "next/image";
import { MessageCircle, PartyPopper } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/network-brand";
import type { NotificationRecord } from "@/components/notification-panel";

export default function BirthdayNotificationCard({
  item,
  onRead,
  compact = false,
}: {
  item: NotificationRecord;
  onRead: () => void | Promise<void>;
  compact?: boolean;
}) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const birthday = item.birthday;
  if (!birthday) return null;
  const eventId = birthday.eventId;
  const firstName = (item.actorName ?? "your connection").trim().split(/\s+/)[0];

  async function openMessage() {
    if (opening) return;
    setOpening(true);
    setError("");
    await onRead();
    const response = await fetch(`/api/birthday-events/${encodeURIComponent(eventId)}/message`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.conversationId) {
      setError(result.error ?? "This conversation could not be opened.");
      setOpening(false);
      return;
    }
    window.location.assign(`/?view=messages&conversation=${encodeURIComponent(result.conversationId)}`);
  }

  return (
    <article className={`birthday-notification-card ${compact ? "compact" : ""} ${item.readAt ? "" : "unread"}`}>
      <div className="birthday-notification-art">
        <Image src={birthday.artworkUrl} alt="Multicultural anime-style n2 members celebrating around a Birthday Project cake" width={1536} height={1024} sizes={compact ? "420px" : "900px"} />
        <span><PartyPopper size={14} /> CONNECTION CELEBRATION</span>
      </div>
      <div className="birthday-notification-copy">
        <Avatar person={{ name: item.actorName ?? "n2 member", role: "", img: item.actorImage }} size="sm" />
        <span>
          <em className="notification-actor">nice 2 network</em>
          <strong>{item.title}</strong>
          <p>{item.body}</p>
          <small>{new Date(item.createdAt).toLocaleString()}</small>
        </span>
        {!item.readAt && <i aria-label="Unread" />}
      </div>
      <button type="button" onClick={openMessage} disabled={opening}><MessageCircle size={15} /> {opening ? "Opening conversation…" : `Wish ${firstName} happy birthday`}</button>
      {error && <p className="birthday-notification-error" role="status">{error}</p>}
    </article>
  );
}
