import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  FolderOpen,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  UserCircle,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { NotificationsBell } from "../components/notifications/NotificationsBell";
import { FourKGuard } from "../components/layout/FourKGuard";

const navItems = [
  { label: "Broadcasts", path: "/member/broadcasts", icon: BookOpen, privileges: ["broadcast.read"] },
  { label: "Resources", path: "/member/resources", icon: FolderOpen, privileges: ["resource.read"] },
  { label: "Profile", path: "/member/profile", icon: UserCircle, privileges: ["profile.read"] },
  { label: "Settings", path: "/member/settings", icon: Settings, privileges: ["profile.read"] },
];

function getPageHeader(pathname: string) {
  if (pathname.startsWith("/member/broadcasts")) return { section: "Communication", title: "Broadcasts" };
  if (pathname.startsWith("/member/resources")) return { section: "Resource library", title: "Resources" };
  if (pathname.startsWith("/member/profile")) return { section: "Member profile", title: "Profile" };
  if (pathname.startsWith("/member/settings")) return { section: "Account", title: "Settings" };
  return { section: "Member", title: "Member Portal" };
}

export function MemberLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const pageHeader = getPageHeader(location.pathname);

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
    <div className="aw-admin-shell grid min-h-[100dvh] grid-cols-1 bg-[var(--aw-bg)] text-[var(--aw-text)] md:h-[100dvh] md:min-h-0 md:overflow-hidden lg:grid-cols-[var(--aw-sidebar-w)_1fr]">
      {mobileNavOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[300] bg-[var(--overlay-scrim)] lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <aside
        className={[
          "aw-admin-sidebar fixed inset-y-0 left-0 z-[400] flex h-[100dvh] w-[var(--aw-sidebar-w)] max-w-[86vw] flex-col overflow-hidden border-r border-white/10 bg-[var(--aw-sidebar)] text-white shadow-2xl transition-transform duration-200 ease-out lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:shadow-none",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/20 bg-white">
              <img
                src="/Prosperity_Party_logo.png"
                alt=""
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black leading-tight text-white">Astedader</h1>
              <p className="text-xl font-black leading-tight text-white">Member</p>
              <p className="mt-1 text-xs font-semibold text-white/68">Member Portal</p>
            </div>
          </div>
        </div>
        <nav id="member-admin-nav" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    "group flex min-h-11 items-center gap-3 border-l-[3px] px-4 py-3 text-sm font-bold transition",
                    isActive
                      ? "border-woreda-yellow bg-woreda-primary text-woreda-onPrimary"
                      : "border-transparent text-white/82 hover:bg-white/8 hover:text-white",
                  ].join(" ")
                }
              >
                <Icon size={19} strokeWidth={2.1} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="text-[11px] font-semibold text-woreda-outlineVariant">Signed in as</p>
          <p className="mt-1 truncate text-sm font-black text-white">{user?.email}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">
            {user?.role}
          </p>
          <button
            onClick={handleLogout}
            className="mt-4 flex w-full min-h-10 items-center justify-center gap-2 border border-white/20 bg-transparent px-3 py-2 text-sm font-black text-white hover:bg-white/10"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
      <section className="flex min-h-[100dvh] min-w-0 flex-col md:h-[100dvh] md:min-h-0 md:overflow-hidden">
        <header className="aw-admin-topbar sticky top-0 z-[200] shrink-0 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-4 py-3 sm:px-5">
          <div className="flex min-h-12 items-center justify-between gap-3 sm:gap-5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center border border-woreda-border bg-woreda-surface text-woreda-text hover:border-woreda-primary hover:text-woreda-primary lg:hidden"
                aria-expanded={mobileNavOpen}
                aria-controls="member-admin-nav"
                aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
                onClick={() => setMobileNavOpen((open) => !open)}
              >
                <Menu size={22} strokeWidth={2.25} />
              </button>
              <div className="min-w-0">
                <p className="aw-admin-page-eyebrow">{pageHeader.section}</p>
                <h2 className="aw-admin-page-title mt-0.5 truncate text-lg sm:text-xl">{pageHeader.title}</h2>
              </div>
            </div>
            <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
              <NotificationsBell />
              <button
                onClick={toggleTheme}
                className="inline-flex min-h-10 items-center gap-2 border border-woreda-border bg-woreda-surface px-3 py-2 text-sm font-black text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
              </button>
              <button
                onClick={handleLogout}
                className="border border-woreda-border bg-woreda-surface px-3 py-2 text-sm font-semibold text-woreda-text lg:hidden"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="aw-admin-content min-h-0 flex-1 bg-[var(--aw-bg)] px-[var(--aw-shell-x)] py-[var(--aw-shell-y)] md:overflow-y-auto max-md:overflow-visible">
          <FourKGuard>
            <div className="aw-admin-page aw-kpi-compact-scope text-fluid-body max-md:overflow-visible">
              <Outlet />
            </div>
          </FourKGuard>
        </main>
      </section>
    </div>
  );
}
