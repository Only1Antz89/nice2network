"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, FolderKanban, Heart, UserPlus, UsersRound } from "lucide-react";
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
        <strong>{item.title}</strong>
        <p>{item.body}</p>
        <small>{new Date(item.createdAt).toLocaleString()}</small>
      </span>
      {!item.readAt && <i aria-label="Unread" />}
    </a>
  );
}

export default function NotificationsPage({ onUnread }: { onUnread: (count: number) => void }) {
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [savingPreference, setSavingPreference] = useState(false);

  useEffect(() => {
    fetch("/api/notifications", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { notifications: [], unread: 0 })
      .then((data) => {
        setItems(data.notifications ?? []);
        setUnread(data.unread ?? 0);
        onUnread(data.unread ?? 0);
        setPreferences({ ...defaultPreferences, ...(data.preferences ?? {}) });
      })
      .finally(() => setLoading(false));
  }, [onUnread]);

  const read = useCallback(async (item?: NotificationRecord) => {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(item ? { action: "read", notificationId: item.id } : { action: "read_all" }),
    });
    if (!response.ok) return;
    if (item) {
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row));
      if (!item.readAt) {
        const next = Math.max(0, unread - 1);
        setUnread(next);
        onUnread(next);
      }
      return;
    }
    setItems((current) => current.map((row) => ({ ...row, readAt: new Date().toISOString() })));
    setUnread(0);
    onUnread(0);
  }, [onUnread, unread]);

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
  return (
    <div className="subpage notifications-page">
      <header className="notifications-page-head">
        <div>
          <span className="eyebrow">YOUR NETWORK</span>
          <h1>Notifications</h1>
          <p>See what changed across your work and the people you follow.</p>
        </div>
        {unread > 0 && <button className="secondary-button" onClick={() => read()}><CheckCheck size={16} /> Mark all read</button>}
      </header>

      <section className="notifications-latest">
        <div className="notifications-section-title"><span>LATEST NOTIFICATION</span>{unread > 0 && <b>{unread} unread</b>}</div>
        {loading ? <p className="notifications-page-empty">Loading notifications…</p> : latest ? <NotificationRow item={latest} onRead={read} /> : <div className="notifications-page-empty"><Bell size={23} /><strong>You’re all caught up</strong><p>New activity will appear here.</p></div>}
      </section>

      <div className="notifications-breakdown">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <section key={group.id} className="notification-group">
              <header>
                <span><i><Icon size={17} /></i><span><strong>{group.title}</strong><small>{group.description}</small></span></span>
                <div>
                  <b>{group.items.length}</b>
                  {group.preference && <button className={`toggle ${preferences.followedUpdates ? "on" : ""}`} aria-label={`${preferences.followedUpdates ? "Disable" : "Enable"} followed-member updates`} aria-pressed={preferences.followedUpdates} disabled={savingPreference} onClick={toggleFollowedUpdates}><i /></button>}
                </div>
              </header>
              {group.items.length ? <div>{group.items.slice(0, 8).map((item) => <NotificationRow key={item.id} item={item} onRead={read} />)}</div> : <p className="notification-group-empty">Nothing here yet.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
