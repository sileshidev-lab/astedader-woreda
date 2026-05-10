import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationService";
import type { AppNotification } from "../../services/notificationService";
import { useAuthStore } from "../../store/authStore";

function rolePath(link: string | null | undefined, role?: string) {
  if (!link) return null;
  if (link.startsWith("/woreda") || link.startsWith("/hibret") || link.startsWith("/member")) return link;
  if (role === "WOREDA_ADMIN") return `/woreda${link}`;
  if (role === "HIBRET_ADMIN") return `/hibret${link}`;
  if (role === "MEMBER") return `/member${link}`;
  return link;
}

export function NotificationsBell() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  async function load() {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      setNotifications([]);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.isUnread).length,
    [notifications]
  );

  async function openNotification(item: AppNotification) {
    await markNotificationRead(item.id);
    await load();
    setOpen(false);
    const link = rolePath(item.link, user?.role);
    if (link) navigate(link);
  }

  async function markAllRead() {
    await markAllNotificationsRead();
    await load();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative hidden h-10 w-10 items-center justify-center border border-transparent text-woreda-textMuted hover:border-woreda-border hover:bg-woreda-surfaceLow hover:text-woreda-primary sm:flex"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center border border-woreda-surface bg-woreda-danger px-1 text-[10px] font-black text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-popover max-w-[calc(100vw-0.75rem)] border border-woreda-border bg-woreda-surface shadow-lg sm:max-w-[calc(100vw-1.5rem)]">
          <div className="flex items-center justify-between border-b border-woreda-border bg-woreda-surfaceLow px-4 py-3">
            <div>
              <p className="text-sm font-black text-woreda-text">Notifications</p>
              <p className="text-xs font-semibold text-woreda-textMuted">{unreadCount} unread</p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex min-h-8 items-center gap-2 border border-woreda-border bg-woreda-surface px-2 text-xs font-black text-woreda-primary"
            >
              <CheckCheck size={14} />
              Mark read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm font-semibold text-woreda-textMuted">
                No notifications yet.
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openNotification(item)}
                  className="block w-full border-b border-woreda-borderLight bg-woreda-surface px-4 py-3 text-left hover:bg-woreda-surfaceLow"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={[
                        "mt-1 h-2 w-2 shrink-0",
                        item.isUnread ? "bg-woreda-primary" : "bg-woreda-border",
                      ].join(" ")}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-woreda-text">{item.title}</p>
                      {item.message ? (
                        <p className="mt-1 line-clamp-2 text-xs font-semibold text-woreda-textMuted">
                          {item.message}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[11px] font-bold text-woreda-textMuted">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
