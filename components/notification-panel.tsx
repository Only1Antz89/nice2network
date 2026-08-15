"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { Avatar } from "@/components/network-brand";

export type NotificationRecord = {
  id: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
  readAt?: string | null;
  createdAt: string;
  actorName?: string | null;
  actorImage?: string | null;
};

export default function NotificationPanel({
  onClose,
  onUnread,
}: {
  onClose: () => void;
  onUnread: (count: number) => void;
}) {
  const [items, setItems] = useState<NotificationRecord[]>([]),
    [unread, setUnread] = useState(0),
    [loading, setLoading] = useState(true);
  const [systemPermission, setSystemPermission] = useState<
    NotificationPermission | "unsupported"
  >(() =>
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission,
  );
  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { notifications: [], unread: 0 }))
      .then((data) => {
        setItems(data.notifications ?? []);
        setUnread(data.unread ?? 0);
        onUnread(data.unread ?? 0);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [onUnread]);
  async function read(item?: NotificationRecord) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        item
          ? { action: "read", notificationId: item.id }
          : { action: "read_all" },
      ),
    });
    if (!response.ok) return;
    if (item) {
      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, readAt: new Date().toISOString() }
            : row,
        ),
      );
      if (!item.readAt)
        setUnread((value) => {
          const next = Math.max(0, value - 1);
          onUnread(next);
          return next;
        });
    } else {
      setItems((current) =>
        current.map((row) => ({ ...row, readAt: new Date().toISOString() })),
      );
      setUnread(0);
      onUnread(0);
    }
  }
  async function enableSystemNotifications() {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setSystemPermission(permission);
    if (permission === "granted")
      localStorage.setItem("n2-system-message-notifications", "enabled");
  }
  return (
    <div
      className="panel-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="notification-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        <header>
          <div>
            <span className="eyebrow">YOUR NETWORK</span>
            <h2>Notifications {unread > 0 && <b>{unread}</b>}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close notifications" onClick={onClose}>
            <X size={19} />
          </button>
        </header>
        {systemPermission === "default" && (
          <button
            className="system-notification-prompt"
            onClick={enableSystemNotifications}
          >
            <Bell size={16} />
            <span>
              <strong>Enable device notifications</strong>
              <small>See new messages even when n2 is in the background.</small>
            </span>
          </button>
        )}
        {systemPermission === "denied" && (
          <p className="system-notification-denied">
            Device notifications are blocked in your browser settings.
          </p>
        )}
        {unread > 0 && (
          <button className="mark-read" onClick={() => read()}>
            <CheckCheck size={15} /> Mark all as read
          </button>
        )}
        <div className="notification-list">
          {loading ? (
            <p className="notification-empty">Loading notifications…</p>
          ) : items.length ? (
            items.map((item) => (
              <a
                key={item.id}
                className={item.readAt ? "" : "unread"}
                href={item.href ?? "#"}
                onClick={() => read(item)}
              >
                <Avatar
                  person={{
                    name: item.actorName ?? "nice 2 network",
                    role: "",
                    img: item.actorImage,
                  }}
                  size="sm"
                />
                <span>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </span>
                {!item.readAt && <i />}
              </a>
            ))
          ) : (
            <div className="notification-empty">
              <Bell size={22} />
              <strong>You’re all caught up</strong>
              <p>
                Project activity, messages, invitations and meets will appear
                here.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
