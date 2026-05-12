import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationService";
import type { AppNotification } from "../../services/notificationService";
import { useAuthStore } from "../../stores/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";

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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative hidden h-9 w-9 items-center justify-center rounded-md border border-[var(--aw-border)] bg-[var(--aw-surface)] text-[var(--aw-muted)] transition hover:border-[var(--aw-border-strong)] hover:bg-[var(--aw-surface-muted)] hover:text-[var(--aw-text)] focus-visible:outline-none focus-visible:border-[var(--aw-primary)] focus-visible:shadow-focus sm:flex"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unreadCount ? (
            <span
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[var(--aw-surface)] px-1 text-[10px] font-medium text-white"
              style={{ background: "var(--aw-danger)" }}
              aria-label={`${unreadCount} unread`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-popover max-w-[calc(100vw-0.75rem)] overflow-hidden border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-0 shadow-lg sm:max-w-[calc(100vw-1.5rem)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-4 py-3">
          <div>
            <p className="font-display text-sm font-semibold text-[var(--aw-text)]">
              Notifications
            </p>
            <p className="mt-0.5 text-xs font-normal text-[var(--aw-muted)]">
              {unreadCount} unread
            </p>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-[var(--aw-border)] bg-[var(--aw-surface)] px-2.5 text-xs font-medium text-[var(--aw-text)] transition hover:border-[var(--aw-border-strong)] hover:bg-[var(--aw-surface-muted)]"
          >
            <CheckCheck size={14} />
            Mark read
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm font-medium text-[var(--aw-muted)]">
              No notifications yet.
            </div>
          ) : (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void openNotification(item)}
                className="block w-full border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-4 py-3 text-left transition hover:bg-[var(--aw-surface-muted)] focus-visible:outline-none focus-visible:bg-[var(--aw-surface-muted)]"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={[
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      item.isUnread
                        ? "bg-[var(--aw-primary)]"
                        : "bg-[var(--aw-border)]",
                    ].join(" ")}
                  />
                  <div className="min-w-0">
                    <p className="font-display text-sm font-medium text-[var(--aw-text)]">
                      {item.title}
                    </p>
                    {item.message ? (
                      <p className="mt-1 line-clamp-2 text-xs font-normal text-[var(--aw-muted)]">
                        {item.message}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-[11px] font-normal text-[var(--aw-muted)]">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
