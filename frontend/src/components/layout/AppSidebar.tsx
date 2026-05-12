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
    <aside
      className="aw-woreda-sidebar relative flex h-[100dvh] w-[var(--aw-sidebar-w)] flex-col overflow-hidden text-white"
      style={{ background: "var(--aw-sidebar)" }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white p-1">
              <img
                src="/Prosperity_Party_logo.png"
                alt="Prosperity Party"
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/55">
                {t("app.name")}
              </p>
              <h1 className="mt-0.5 truncate font-display text-[13px] font-semibold text-white">
                {roleLabel}
              </h1>
            </div>
          </div>

          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/70 transition hover:bg-white/8 hover:text-white"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>

        <nav
          id={navId}
          className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3"
          aria-label={navAriaLabel}
        >
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      [
                        "group relative flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-fast",
                        isActive
                          ? "bg-white/8 font-medium text-white"
                          : "font-normal text-white/65 hover:bg-white/6 hover:text-white",
                      ].join(" ")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          aria-hidden
                          className={[
                            "absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r transition-opacity duration-fast",
                            isActive ? "opacity-100" : "opacity-0",
                          ].join(" ")}
                          style={{ background: "rgba(255,255,255,0.9)" }}
                        />
                        <Icon size={16} className="shrink-0 opacity-80" />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-white/8 p-2.5">
          <div className="rounded-md p-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/45">
              {t("layout.signedIn")}
            </p>

            <p
              className="mt-1 truncate font-display text-[13px] font-medium text-white"
              title={userEmail || "-"}
            >
              {userEmail || "-"}
            </p>

            <p className="mt-0.5 truncate text-[11px] font-normal text-white/55">
              {userRole || "-"}
            </p>

            <button
              type="button"
              onClick={onLogout}
              className="mt-2.5 inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium text-white/85 transition hover:bg-white/6 hover:text-white"
              style={{ border: "1px solid rgba(255,255,255,0.10)" }}
            >
              <LogOut size={14} />
              {t("common.logout")}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
