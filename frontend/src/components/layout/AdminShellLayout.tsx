import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import { FourKGuard } from "./FourKGuard";
import { AppTopbar } from "./AppTopbar";
import { AppSidebar } from "./AppSidebar";
import { MobileSidebar } from "./MobileSidebar";

export type AdminShellNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  privileges: string[];
};

export type AdminShellHeaderInfo = {
  section: string;
  title: string;
  description?: string;
};

type AdminShellLayoutProps = {
  roleLabel: string;
  navId: string;
  navAriaLabel: string;
  navItems: AdminShellNavItem[];
  getPageHeader: (pathname: string) => AdminShellHeaderInfo;
  lockPageScroll?: (pathname: string) => boolean;
};

export function AdminShellLayout({
  roleLabel,
  navId,
  navAriaLabel,
  navItems,
  getPageHeader,
  lockPageScroll,
}: AdminShellLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

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
  }, [canAccessAll, navItems, privileges]);

  const pageHeader = useMemo(() => getPageHeader(location.pathname), [getPageHeader, location.pathname]);
  const shouldLockPageScroll = lockPageScroll?.(location.pathname) ?? false;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="aw-responsive-shell aw-woreda-layout grid min-h-[100dvh] grid-cols-1 bg-[var(--aw-bg)] text-[var(--aw-text)] md:h-[100dvh] md:min-h-0 md:overflow-hidden lg:grid-cols-[var(--aw-sidebar-w)_minmax(0,1fr)]">
      <MobileSidebar
        isOpen={mobileNavOpen}
        navId={navId}
        navAriaLabel={navAriaLabel}
        roleLabel={roleLabel}
        userEmail={user?.email ?? "-"}
        userRole={user?.role ?? "-"}
        navItems={visibleNavItems}
        onLogout={handleLogout}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="hidden lg:block">
        <AppSidebar
          navId={navId}
          navAriaLabel={navAriaLabel}
          roleLabel={roleLabel}
          userEmail={user?.email ?? "-"}
          userRole={user?.role ?? "-"}
          navItems={visibleNavItems}
          onLogout={handleLogout}
        />
      </div>

      <div className="aw-responsive-main flex min-h-[100dvh] min-w-0 flex-col md:h-[100dvh] md:min-h-0 md:overflow-hidden">
        <AppTopbar
          navId={navId}
          mobileNavOpen={mobileNavOpen}
          header={pageHeader}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main
          className={[
            "aw-responsive-content aw-woreda-content flex min-h-0 flex-1 flex-col bg-[var(--aw-bg)] px-4 py-[var(--aw-shell-y)] sm:px-5 lg:px-6",
            shouldLockPageScroll ? "md:overflow-hidden" : "md:overflow-y-auto",
          ].join(" ")}
        >
          <FourKGuard className="aw-guard flex w-full flex-1 flex-col md:min-h-0">
            <div
              className={[
                "aw-admin-page flex min-h-0 flex-1 flex-col max-md:overflow-visible",
                shouldLockPageScroll ? "md:overflow-hidden" : "overflow-visible",
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
