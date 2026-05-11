import { Menu, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NotificationsBell } from "../notifications/NotificationsBell";

export type TopbarHeader = {
  section: string;
  title: string;
  description?: string;
};

export function AppTopbar({
  navId,
  mobileNavOpen,
  header,
  theme,
  onToggleTheme,
  onOpenMobileNav,
}: {
  navId: string;
  mobileNavOpen: boolean;
  header: TopbarHeader;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenMobileNav: () => void;
}) {
  const { t } = useTranslation();

  return (
    <header className="aw-woreda-topbar sticky top-0 z-[200] shrink-0 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)]/90 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-3 px-[var(--aw-shell-x)]">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] text-[var(--aw-primary-dark)] shadow-sm transition hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)] lg:hidden"
            onClick={onOpenMobileNav}
            aria-controls={navId}
            aria-expanded={mobileNavOpen}
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <p className="hidden text-xs font-black uppercase tracking-[0.18em] text-[var(--aw-muted)] sm:block">
              {header.section}
            </p>

            <h1 className="truncate text-xl font-black leading-tight text-[var(--aw-text)]">{header.title}</h1>

            {header.description ? (
              <p className="hidden truncate text-sm font-semibold text-[var(--aw-muted)] xl:block">
                {header.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="aw-woreda-topbar-actions flex shrink-0 items-center justify-end gap-2">
          <NotificationsBell />

          <button
            type="button"
            onClick={onToggleTheme}
            className="aw-woreda-theme-button inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[color:color-mix(in_srgb,var(--aw-border-soft)_70%,transparent)] bg-[var(--aw-surface-muted)] px-3 py-2 text-sm font-black text-[var(--aw-text)] shadow-sm transition hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span className="hidden sm:inline">{theme === "dark" ? t("common.light") : t("common.dark")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

