import { Menu } from "lucide-react";
import { NotificationsBell } from "../notifications/NotificationsBell";
import { UserMenu } from "./UserMenu";

export type TopbarHeader = {
  section: string;
  title: string;
  description?: string;
};

export function AppTopbar({
  navId,
  mobileNavOpen,
  header,
  onOpenMobileNav,
}: {
  navId: string;
  mobileNavOpen: boolean;
  header: TopbarHeader;
  // Theme state stays in the parent so the rest of the app can read it
  // (e.g. recharts colors); the user menu wires its own theme toggle
  // through useThemeStore directly.
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  onOpenMobileNav: () => void;
}) {
  return (
    <header className="aw-woreda-topbar aw-admin-topbar sticky top-0 z-[200] shrink-0 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)]/95 backdrop-blur">
      <div className="flex min-h-14 items-center justify-between gap-3 px-[var(--aw-shell-x)]">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--aw-border)] bg-[var(--aw-surface)] text-[var(--aw-muted)] transition hover:border-[var(--aw-border-strong)] hover:bg-[var(--aw-surface-muted)] hover:text-[var(--aw-text)] lg:hidden"
            onClick={onOpenMobileNav}
            aria-controls={navId}
            aria-expanded={mobileNavOpen}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0">
            <p
              className="hidden text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--aw-muted)] sm:block"
              aria-hidden={header.section ? undefined : true}
            >
              {header.section}
            </p>

            <h1 className="truncate font-display text-[15px] font-semibold leading-snug text-[var(--aw-text)]">
              {header.title}
            </h1>

            {header.description ? (
              <p className="hidden truncate text-[12px] font-normal text-[var(--aw-muted)] xl:block">
                {header.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="aw-woreda-topbar-actions flex shrink-0 items-center gap-2">
          <NotificationsBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
