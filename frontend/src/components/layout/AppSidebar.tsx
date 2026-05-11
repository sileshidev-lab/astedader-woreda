import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { LogOut, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export type SidebarNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  privileges: string[];
};

export function AppSidebar({
  navId,
  navAriaLabel,
  roleLabel,
  userEmail,
  userRole,
  navItems,
  onLogout,
  onClose,
  showCloseButton,
}: {
  navId: string;
  navAriaLabel: string;
  roleLabel: string;
  userEmail: string;
  userRole: string;
  navItems: SidebarNavItem[];
  onLogout: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <aside className="aw-woreda-sidebar flex h-[100dvh] w-[var(--aw-sidebar-w)] flex-col overflow-hidden bg-[#004C6B] text-white">
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
              <h1 className="mt-1 truncate text-lg font-black text-white">{roleLabel}</h1>
            </div>
          </div>

          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          ) : null}
        </div>

        <nav id={navId} className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label={navAriaLabel}>
          {navItems.map((item) => {
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
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="rounded-2xl bg-white/10 p-4 shadow-sm ring-1 ring-white/10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/55">
              {t("layout.signedIn")}
            </p>

            <p className="mt-2 truncate text-sm font-black text-white">{userEmail || "-"}</p>

            <p className="mt-1 truncate text-xs font-bold text-white/80">{userRole || "-"}</p>

            <button
              type="button"
              onClick={onLogout}
              className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#A00061] px-3 py-2 text-sm font-black text-white transition hover:opacity-90"
            >
              <LogOut size={16} />
              {t("common.logout")}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
