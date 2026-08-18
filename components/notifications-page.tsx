"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, FolderKanban, Heart, Trash2, UserPlus, UsersRound } from "lucide-react";
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

function NotificationRow({ item, onRead }: { item: NotificationRecord; onRead: (item: NotificationRecord) => void }) {
  return (
    <a className={`notifications-page-row ${item.readAt ? "" : "unread"}`} href={item.href ?? "#"} onClick={() => onRead(item)}>
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
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  const [activeGroupId, setActiveGroupId] = useState("projects");

  useEffect(() => {
    fetch("/api/notifications", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { notifications: [], unread: 0 })
      .then((data) => {
        setItems((data.notifications ?? []).filter((item: NotificationRecord) => item.type !== "message"));
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

  async function clearAll() {
    if (!items.length || !window.confirm("Clear all notifications? This cannot be undone.")) return;
    setClearing(true);
    setClearError("");
    try {
      const response = await fetch("/api/notifications", { method: "DELETE" });
      if (!response.ok) {
        setClearError("Could not clear notifications. Please try again.");
        return;
      }
      const result = await response.json();
      setItems([]);
      setUnread(0);
      onUnreadCounts(result.unread ?? 0, result.unreadMessages ?? 0);
    } catch {
      setClearError("Could not clear notifications. Please try again.");
    } finally {
      setClearing(false);
    }
  }

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
      id: "projects",
      title: "Reactions to projects",
      description: "Views, follows, comments, applications and other activity around your projects.",
      icon: FolderKanban,
      items: items.filter((item) => item.type !== "following" && item.entityType !== "post" && (item.entityType === "project" || ["project", "application", "invitation"].includes(item.type))),
    },
    {
      id: "posts",
      title: "Reactions to posts",
      description: "Likes, reposts and replies to what you share.",
      icon: Heart,
      items: items.filter((item) => item.type !== "following" && item.entityType === "post"),
    },
    {
      id: "followers",
      title: "New followers",
      description: "People who followed you and new mutual connections.",
      icon: UserPlus,
      items: items.filter((item) => item.entityType === "user" && item.type === "match"),
    },
    {
      id: "following",
      title: "Updates from people you follow",
      description: preferences.followedUpdates ? "New posts and public project updates from members you follow." : "Turn this on when you want updates from members you follow.",
      icon: UsersRound,
      items: items.filter((item) => item.type === "following"),
      preference: true,
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
        <div className="notifications-page-actions">
          {unread > 0 && <button className="secondary-button" disabled={clearing} onClick={() => read()}><CheckCheck size={16} /> Mark all read</button>}
          {!loading && items.length > 0 && <button className="secondary-button notifications-clear-button" disabled={clearing} onClick={clearAll}><Trash2 size={16} /> {clearing ? "Clearing…" : "Clear all"}</button>}
        </div>
      </header>

      {clearError && <p className="notifications-action-error" role="alert">{clearError}</p>}

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
              <b>{group.items.length}</b>
            </button>
          );
        })}
      </div>

      <section
        className="notification-group notification-tab-panel"
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
