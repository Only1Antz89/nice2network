"use client";

import Image from "next/image";
import { ArrowUpRight, PartyPopper } from "lucide-react";
import { Avatar } from "@/components/network-brand";
import type { NotificationRecord } from "@/components/notification-panel";

export default function ProjectJoinNotificationCard({ item, onRead, compact = false }: {
  item: NotificationRecord;
  onRead: () => void | Promise<void>;
  compact?: boolean;
}) {
  if (!item.projectJoin) return null;
  return (
    <article className={`project-join-notification-card ${compact ? "compact" : ""} ${item.readAt ? "" : "unread"}`}>
      <div className="project-join-notification-art">
        <Image src={item.projectJoin.artworkUrl} alt={`${item.actorName ?? "An n2 member"} being welcomed to a new project team`} width={1774} height={887} sizes={compact ? "420px" : "900px"} />
        <span><PartyPopper size={14} /> NEW PROJECT CHAPTER</span>
      </div>
      <div className="project-join-notification-copy">
        <Avatar person={{ name: item.actorName ?? "n2 member", role: "", img: item.actorImage }} size="sm" />
        <span><em className="notification-actor">FOLLOWED MEMBER UPDATE</em><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString()}</small></span>
        {!item.readAt && <i aria-label="Unread" />}
      </div>
      <a href={item.href ?? `/?view=projects&project=${encodeURIComponent(item.projectJoin.projectId)}`} onClick={() => onRead()}>View project <ArrowUpRight size={14} /></a>
    </article>
  );
}
