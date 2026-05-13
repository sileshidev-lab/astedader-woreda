import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  FolderOpen,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Sun,
  UserCircle,
  X,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { NotificationsBell } from "../components/notifications/NotificationsBell";
import { FourKGuard } from "../components/layout/FourKGuard";
import { useTranslation } from "react-i18next";

const navItems = [
  { labelKey: "sidebar.broadcasts", path: "/member/broadcasts", icon: BookOpen, privileges: ["broadcast.read"] },
  { labelKey: "sidebar.resources", path: "/member/resources", icon: FolderOpen, privileges: ["resource.read"] },
  { labelKey: "sidebar.chat", path: "/member/chat", icon: MessageSquare, privileges: ["chat.read"] },
  { labelKey: "sidebar.profile", path: "/member/profile", icon: UserCircle, privileges: ["profile.read"] },
  { labelKey: "sidebar.settings", path: "/member/settings", icon: Settings, privileges: ["profile.read"] },
];

function getPageHeader(pathname: string, t: (key: string) => string) {
  if (pathname.startsWith("/member/broadcasts")) return { section: t("layout.member.sections.communication"), title: t("sidebar.broadcasts") };
  if (pathname.startsWith("/member/resources")) return { section: t("layout.member.sections.resources"), title: t("sidebar.resources") };
  if (pathname.startsWith("/member/chat")) return { section: t("layout.member.sections.communication"), title: t("sidebar.chat") };
  if (pathname.startsWith("/member/profile")) return { section: t("layout.member.sections.account"), title: t("sidebar.profile") };
  if (pathname.startsWith("/member/settings")) return { section: t("layout.member.sections.account"), title: t("sidebar.settings") };
  return { section: t("layout.member.roleLabel"), title: t("layout.member.consoleTitle") };
}

export function MemberLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const pageHeader = getPageHeader(location.pathname, t);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const visibleNavItems = navItems.filter((item) => {
    const privileges = user?.privileges ?? [];
    if (privileges.includes("*")) return true;
    return item.privileges.some((privilege) => privileges.includes(privilege));
  });

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="aw-responsive-shell grid min-h-[100dvh] grid-cols-1 bg-[var(--aw-bg)] text-[var(--aw-text)] md:h-[100dvh] md:min-h-0 md:overflow-hidden lg:grid-cols-[var(--aw-sidebar-w)_minmax(0,1fr)]">
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
                <img src="/Prosperity_Party_logo.png" alt="Prosperity Party" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--aw-yellow)]">
                  {t("app.name")}
                </p>
                <h1 className="mt-1 truncate text-lg font-black text-white">
                  {t("layout.member.roleLabel")}
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

          <nav id="member-admin-nav" className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Member navigation">
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
              <p className="mt-2 truncate text-sm font-black text-white">{user?.email ?? "—"}</p>
              <p className="mt-1 truncate text-xs font-bold text-white/80">{user?.role ?? "—"}</p>
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
        <header className="aw-responsive-topbar sticky top-0 z-[200] shrink-0 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)]/90 backdrop-blur">
          <div className="flex h-full w-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] text-[var(--aw-primary-dark)] shadow-sm transition hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)] lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-controls="member-admin-nav"
                aria-expanded={mobileNavOpen}
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <p className="hidden text-xs font-black uppercase tracking-[0.18em] text-[var(--aw-muted)] sm:block">
                  {pageHeader.section}
                </p>
                <h2 className="truncate text-xl font-black leading-tight text-[var(--aw-text)]">
                  {pageHeader.title}
                </h2>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2">
              <NotificationsBell />
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[color:color-mix(in_srgb,var(--aw-border-soft)_70%,transparent)] bg-[var(--aw-surface-muted)] px-3 py-2 text-sm font-black text-[var(--aw-text)] shadow-sm transition hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                <span className="hidden sm:inline">
                  {theme === "dark" ? t("common.light") : t("common.dark")}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="aw-responsive-content flex min-h-0 flex-1 flex-col bg-[var(--aw-bg)] md:overflow-y-auto max-md:overflow-visible">
          <FourKGuard className="aw-guard flex w-full flex-1 flex-col md:min-h-0">
            <div className="flex min-h-0 flex-1 flex-col text-[var(--aw-text)] max-md:overflow-visible overflow-visible">
              <Outlet />
            </div>
          </FourKGuard>
        </main>
      </div>
    </div>
  );
}
