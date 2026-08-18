"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AtSign, Bell, CheckCheck, FolderKanban, UserPlus } from "lucide-react";
import { Avatar } from "@/components/network-brand";
import type { NotificationRecord } from "@/components/notification-panel";

type NotificationPreferences = {
  messages: boolean;
  projects: boolean;
  matches: boolean;
  meets: boolean;
  officialNotices: boolean;
  followedUpdates: boolean;
  emailDigest: "daily" | "weekly" | "never";
};

const defaultPreferences: NotificationPreferences = {
  messages: true,
  projects: true,
  matches: true,
  meets: true,
  officialNotices: true,
  followedUpdates: true,
  emailDigest: "weekly",
};

function isMentionNotification(item: NotificationRecord) {
  return /(?:tagged|mentioned) you/i.test(`${item.title} ${item.body}`);
}

function isFollowerNotification(item: NotificationRecord) {
  return item.type === "match" && item.entityType === "user";
}

function isProjectNotification(item: NotificationRecord) {
  if (isMentionNotification(item) || isFollowerNotification(item) || item.type === "following" || item.entityType === "post") return false;
  return ["project", "project_update", "application", "invitation", "recommendation"].includes(item.entityType ?? "")
    || ["project", "application", "invitation"].includes(item.type);
}

function NotificationRow({ item, onRead }: { item: NotificationRecord; onRead: (item: NotificationRecord) => void }) {
  const connection = isFollowerNotification(item);
  return (
    <a className={`notifications-page-row ${item.readAt ? "" : "unread"} ${connection ? "connection" : ""}`} href={item.href ?? "#"} onClick={() => onRead(item)}>
      <Avatar person={{ name: item.actorName ?? "nice 2 network", role: "", img: item.actorImage }} size="sm" />
      <span>
        <em className="notification-actor">{item.actorName ?? "nice 2 network"}</em>
        <strong>{item.title}</strong>
        <p>{item.body}</p>
        <small>{new Date(item.createdAt).toLocaleString()}</small>
      </span>
      {!item.readAt && <i aria-label="Unread" />}
    </a>
  );
}

export default function NotificationsPage({ onUnreadCounts }: { onUnreadCounts: (unread: number, unreadMessages: number) => void }) {
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [savingPreference, setSavingPreference] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState("all");

  useEffect(() => {
    fetch("/api/notifications", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { notifications: [], unread: 0 })
      .then((data) => {
        setItems((data.notifications ?? []).filter((item: NotificationRecord) => item.type !== "message" || isMentionNotification(item)));
        setUnread(data.unread ?? 0);
        onUnreadCounts(data.unread ?? 0, data.unreadMessages ?? 0);
        setPreferences({ ...defaultPreferences, ...(data.preferences ?? {}) });
      })
      .finally(() => setLoading(false));
  }, [onUnreadCounts]);

  const read = useCallback(async (item?: NotificationRecord) => {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(item ? { action: "read", notificationId: item.id } : { action: "read_all" }),
    });
    if (!response.ok) return;
    const result = await response.json();
    onUnreadCounts(result.unread ?? 0, result.unreadMessages ?? 0);
    if (item) {
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row));
      if (!item.readAt) {
        const next = Math.max(0, unread - 1);
        setUnread(next);
      }
      return;
    }
    setItems((current) => current.map((row) => ({ ...row, readAt: new Date().toISOString() })));
    setUnread(0);
  }, [onUnreadCounts, unread]);

  async function toggleFollowedUpdates() {
    const next = { ...preferences, followedUpdates: !preferences.followedUpdates };
    setPreferences(next);
    setSavingPreference(true);
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "preferences", ...next }),
    });
    if (!response.ok) setPreferences(preferences);
    setSavingPreference(false);
  }

  const groups = useMemo(() => [
    {
      id: "all",
      title: "All",
      description: preferences.followedUpdates ? "Updates from people you follow, post replies, likes, reposts and other activity." : "Post replies, reactions and other activity. Followed-member updates are paused.",
      icon: Bell,
      items: items.filter((item) => !isMentionNotification(item) && !isFollowerNotification(item) && !isProjectNotification(item)),
      preference: true,
    },
    {
      id: "projects",
      title: "Projects",
      description: "Views, follows, comments, applications and other activity around your projects.",
      icon: FolderKanban,
      items: items.filter(isProjectNotification),
    },
    {
      id: "followers",
      title: "Followers",
      description: "People who followed you and new mutual connections.",
      icon: UserPlus,
      items: items.filter(isFollowerNotification),
    },
    {
      id: "mentions",
      title: "Mentions",
      description: "Posts, replies and group messages where someone tagged you.",
      icon: AtSign,
      items: items.filter(isMentionNotification),
    },
  ], [items, preferences.followedUpdates]);

  const latest = items[0];
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];
  const ActiveGroupIcon = activeGroup.icon;
  return (
    <div className="subpage notifications-page">
      <header className="notifications-page-head">
        <div>
          <span className="eyebrow">YOUR NETWORK</span>
          <h1>Notifications</h1>
          <p>See what changed across your work and the people you follow.</p>
        </div>
        {unread > 0 && <div className="notifications-page-actions"><button className="secondary-button" onClick={() => read()}><CheckCheck size={16} /> Mark all read</button></div>}
      </header>

      <section className="notifications-latest">
        <div className="notifications-section-title"><span>LATEST NOTIFICATION</span>{unread > 0 && <b>{unread} unread</b>}</div>
        {loading ? <p className="notifications-page-empty">Loading notifications…</p> : latest ? <NotificationRow item={latest} onRead={read} /> : <div className="notifications-page-empty"><Bell size={23} /><strong>You’re all caught up</strong><p>New activity will appear here.</p></div>}
      </section>

      <div className="notification-tabs" role="tablist" aria-label="Notification categories">
        {groups.map((group) => {
          const selected = group.id === activeGroup.id;
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              id={`notification-tab-${group.id}`}
              aria-selected={selected}
              aria-controls={`notification-panel-${group.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveGroupId(group.id)}
            >
              <span>{group.title}</span>
              {group.items.length > 0 && <b>{group.items.length}</b>}
            </button>
          );
        })}
      </div>

      <section
        className={`notification-group notification-tab-panel notification-group-${activeGroup.id}`}
        role="tabpanel"
        id={`notification-panel-${activeGroup.id}`}
        aria-labelledby={`notification-tab-${activeGroup.id}`}
      >
        <header>
          <span><i><ActiveGroupIcon size={17} /></i><span><strong>{activeGroup.title}</strong><small>{activeGroup.description}</small></span></span>
          {activeGroup.preference && <button className={`toggle ${preferences.followedUpdates ? "on" : ""}`} aria-label={`${preferences.followedUpdates ? "Disable" : "Enable"} followed-member updates`} aria-pressed={preferences.followedUpdates} disabled={savingPreference} onClick={toggleFollowedUpdates}><i /></button>}
        </header>
        {activeGroup.items.length ? <div>{activeGroup.items.map((item) => <NotificationRow key={item.id} item={item} onRead={read} />)}</div> : <p className="notification-group-empty">Nothing here yet.</p>}
      </section>
    </div>
  );
}
