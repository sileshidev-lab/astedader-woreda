import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  BookOpen,
  FolderOpen,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Shield,
  Sun,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { useWoredaHibretDetailHeaderStore } from "../store/woredaHibretDetailHeaderStore";
import { NotificationsBell } from "../components/notifications/NotificationsBell";
import { FourKGuard } from "../components/layout/FourKGuard";

type NavItem = {
  labelKey: string;
  path: string;
  icon: LucideIcon;
  privileges: string[];
};

const navItems: NavItem[] = [
  {
    labelKey: "sidebar.dashboard",
    path: "/woreda/dashboard",
    icon: LayoutDashboard,
    privileges: ["announcement.read"],
  },
  {
    labelKey: "sidebar.announcements",
    path: "/woreda/announcements",
    icon: Bell,
    privileges: ["announcement.read"],
  },
  {
    labelKey: "sidebar.hibrets",
    path: "/woreda/hibrets",
    icon: Workflow,
    privileges: ["hibret.read"],
  },
  {
    labelKey: "sidebar.users",
    path: "/woreda/users",
    icon: Users,
    privileges: ["member_account.read"],
  },
  {
    labelKey: "sidebar.members",
    path: "/woreda/members",
    icon: Users,
    privileges: ["member.read"],
  },
  {
    labelKey: "sidebar.admins",
    path: "/woreda/admins",
    icon: Shield,
    privileges: ["admin.read"],
  },
  {
    labelKey: "sidebar.resources",
    path: "/woreda/resources",
    icon: FolderOpen,
    privileges: ["resource.read"],
  },
  {
    labelKey: "sidebar.gallery",
    path: "/woreda/gallery",
    icon: Image,
    privileges: ["gallery.read"],
  },
  {
    labelKey: "sidebar.broadcasts",
    path: "/woreda/broadcasts",
    icon: BookOpen,
    privileges: ["broadcast.read"],
  },
  {
    labelKey: "sidebar.chat",
    path: "/woreda/chat",
    icon: MessageSquare,
    privileges: ["chat.read"],
  },
  {
    labelKey: "sidebar.activity",
    path: "/woreda/activity",
    icon: Activity,
    privileges: ["activity.read"],
  },
  {
    labelKey: "sidebar.settings",
    path: "/woreda/settings",
    icon: Settings,
    privileges: ["profile.read", "profile.update"],
  },
];

type HeaderInfo = {
  section: string;
  title: string;
  description?: string;
};

function isWoredaHibretDetailRoute(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || pathname;
  if (!normalized.startsWith("/woreda/hibrets/")) return false;
  const rest = normalized.slice("/woreda/hibrets/".length);
  return rest.length > 0 && !rest.includes("/");
}

function getPageHeader(pathname: string, t: (key: string) => string): HeaderInfo {
  if (pathname.startsWith("/woreda/dashboard") || pathname === "/woreda") {
    return {
      section: t("layout.woreda.sections.console"),
      title: t("sidebar.dashboard"),
      description: t("topbar.dashboardSubtitle"),
    };
  }

  if (pathname.startsWith("/woreda/announcements")) {
    return {
      section: t("layout.woreda.sections.directives"),
      title: t("sidebar.announcements"),
      description: t("layout.woreda.descriptions.directives"),
    };
  }

  if (pathname.startsWith("/woreda/hibrets")) {
    return {
      section: t("layout.woreda.sections.community"),
      title: t("sidebar.hibrets"),
      description: t("layout.woreda.descriptions.hibrets"),
    };
  }

  if (pathname.startsWith("/woreda/users")) {
    return {
      section: t("layout.woreda.sections.access"),
      title: t("sidebar.users"),
      description: t("layout.woreda.descriptions.users"),
    };
  }

  if (pathname.startsWith("/woreda/members")) {
    return {
      section: t("layout.woreda.sections.membership"),
      title: t("sidebar.members"),
      description: t("layout.woreda.descriptions.members"),
    };
  }

  if (pathname.startsWith("/woreda/admins")) {
    return {
      section: t("layout.woreda.sections.access"),
      title: t("sidebar.admins"),
      description: t("layout.woreda.descriptions.admins"),
    };
  }

  if (pathname.startsWith("/woreda/resources")) {
    return {
      section: t("layout.woreda.sections.resources"),
      title: t("sidebar.resources"),
      description: t("layout.woreda.descriptions.resources"),
    };
  }

  if (pathname.startsWith("/woreda/gallery")) {
    return {
      section: t("layout.woreda.sections.gallery"),
      title: t("sidebar.gallery"),
      description: t("layout.woreda.descriptions.gallery"),
    };
  }

  if (pathname.startsWith("/woreda/broadcasts")) {
    return {
      section: t("layout.woreda.sections.communication"),
      title: t("sidebar.broadcasts"),
      description: t("layout.woreda.descriptions.broadcasts"),
    };
  }

  if (pathname.startsWith("/woreda/chat")) {
    return {
      section: t("layout.woreda.sections.communication"),
      title: t("sidebar.chat"),
      description: t("layout.woreda.descriptions.chat"),
    };
  }

  if (pathname.startsWith("/woreda/activity")) {
    return {
      section: t("layout.woreda.sections.monitoring"),
      title: t("sidebar.activity"),
      description: t("layout.woreda.descriptions.activity"),
    };
  }

  if (pathname.startsWith("/woreda/settings")) {
    return {
      section: t("layout.woreda.sections.account"),
      title: t("sidebar.settings"),
      description: t("layout.woreda.descriptions.settings"),
    };
  }

  return {
    section: t("layout.woreda.sections.console"),
    title: t("layout.woreda.consoleTitle"),
    description: t("layout.woreda.consoleDescription"),
  };
}

export function WoredaLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const hibretDetailTitle = useWoredaHibretDetailHeaderStore(
    (state) => state.detailTitle,
  );

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const privileges = user?.privileges ?? [];
  const canAccessAll = privileges.includes("*");

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => {
      if (canAccessAll) return true;
      return item.privileges.some((privilege) => privileges.includes(privilege));
    });
  }, [canAccessAll, privileges]);

  const pageHeader = useMemo(() => {
    if (isWoredaHibretDetailRoute(location.pathname) && hibretDetailTitle) {
      return {
        section: t("layout.woreda.sections.community"),
        title: hibretDetailTitle,
        description: t("layout.woreda.descriptions.hibrets"),
      };
    }

    return getPageHeader(location.pathname, t);
  }, [hibretDetailTitle, location.pathname, t]);

  const lockAdminPageScroll =
    location.pathname.startsWith("/woreda/announcements/") ||
    location.pathname.includes("/report-review") ||
    location.pathname.includes("/reports/");

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="aw-responsive-shell aw-woreda-layout grid min-h-[100dvh] grid-cols-1 bg-[var(--aw-bg)] text-[var(--aw-text)] md:h-[100dvh] md:min-h-0 md:overflow-hidden lg:grid-cols-[var(--aw-sidebar-w)_minmax(0,1fr)]">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-[300] bg-[var(--aw-primary-dark)]/70 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={[
          "aw-woreda-sidebar fixed inset-y-0 left-0 z-[400] flex h-[100dvh] w-[var(--aw-sidebar-w)] max-w-[86vw] -translate-x-full flex-col overflow-hidden bg-[var(--aw-primary-dark)] text-white shadow-2xl transition-transform duration-200 ease-out lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:shadow-none",
          mobileNavOpen ? "translate-x-0" : "",
        ].join(" ")}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm">
                <img
                  src="/Prosperity_Party_logo.png"
                  alt="Prosperity Party"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--aw-yellow)]">
                  {t("app.name")}
                </p>
                <h1 className="mt-1 truncate text-lg font-black text-white">
                  {t("layout.woreda.roleLabel")}
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white/80 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          </div>

          <nav
            id="woreda-admin-nav"
            className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
            aria-label="Woreda admin navigation"
          >
            {visibleNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    [
                      "group mt-1 flex min-h-12 items-center gap-3 rounded-2xl border-l-4 px-4 py-3 text-sm transition-colors",
                      isActive
                        ? "border-[var(--aw-yellow)] bg-white/12 font-black text-white shadow-sm"
                        : "border-transparent font-bold text-white/75 hover:bg-white/10 hover:text-white",
                    ].join(" ")
                  }
                >
                  <Icon size={19} className="shrink-0" />
                  <span className="truncate">{t(item.labelKey)}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-white/10 p-4">
            <div className="rounded-2xl bg-white/10 p-4 shadow-sm ring-1 ring-white/10">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/55">
                {t("layout.signedIn")}
              </p>

              <p className="mt-2 truncate text-sm font-black text-white">
                {user?.email ?? "—"}
              </p>

              <p className="mt-1 truncate text-xs font-bold text-white/80">
                {user?.role ?? "—"}
              </p>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--aw-secondary)] px-3 py-2 text-sm font-black text-white transition hover:opacity-90"
              >
                <LogOut size={16} />
                {t("common.logout")}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="aw-responsive-main flex min-h-[100dvh] min-w-0 flex-col md:h-[100dvh] md:min-h-0 md:overflow-hidden">
        <header className="aw-woreda-topbar sticky top-0 z-[200] shrink-0 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)]/90 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-[var(--aw-shell-x)]">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] text-[var(--aw-primary-dark)] shadow-sm transition hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)] lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-controls="woreda-admin-nav"
                aria-expanded={mobileNavOpen}
              >
                <Menu size={20} />
              </button>

              <div className="min-w-0">
                <p className="hidden text-xs font-black uppercase tracking-[0.18em] text-[var(--aw-muted)] sm:block">
                  {pageHeader.section}
                </p>

                <h1 className="truncate text-xl font-black leading-tight text-[var(--aw-text)]">
                  {pageHeader.title}
                </h1>

                {pageHeader.description ? (
                  <p className="hidden truncate text-sm font-semibold text-[var(--aw-muted)] xl:block">
                    {pageHeader.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="aw-woreda-topbar-actions flex shrink-0 items-center justify-end gap-2">
              <NotificationsBell />

              <button
                type="button"
                onClick={toggleTheme}
                className="aw-woreda-theme-button inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[color:color-mix(in_srgb,var(--aw-border-soft)_70%,transparent)] bg-[var(--aw-surface-muted)] px-3 py-2 text-sm font-black text-[var(--aw-text)] shadow-sm transition hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                <span className="hidden sm:inline">
                  {theme === "dark" ? t("common.light") : t("common.dark")}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main
          className={[
            "aw-responsive-content aw-woreda-content flex min-h-0 flex-1 flex-col bg-[var(--aw-bg)] px-4 py-[var(--aw-shell-y)] sm:px-5 lg:px-6",
            lockAdminPageScroll ? "md:overflow-hidden" : "md:overflow-y-auto",
          ].join(" ")}
        >
          <FourKGuard className="aw-guard flex w-full flex-1 flex-col md:min-h-0">
            <div
              className={[
                "aw-admin-page flex min-h-0 flex-1 flex-col max-md:overflow-visible",
                lockAdminPageScroll ? "md:overflow-hidden" : "overflow-visible",
              ].join(" ")}
            >
              <Outlet />
            </div>
          </FourKGuard>
        </main>
      </div>
    </div>
  );
}
