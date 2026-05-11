import { AppSidebar, type SidebarNavItem } from "./AppSidebar";

export function MobileSidebar({
  isOpen,
  navId,
  navAriaLabel,
  roleLabel,
  userEmail,
  userRole,
  navItems,
  onLogout,
  onClose,
}: {
  isOpen: boolean;
  navId: string;
  navAriaLabel: string;
  roleLabel: string;
  userEmail: string;
  userRole: string;
  navItems: SidebarNavItem[];
  onLogout: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-[300] bg-[#004C6B]/70 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <div
        className={[
          "fixed inset-y-0 left-0 z-[400] h-[100dvh] w-[var(--aw-sidebar-w)] max-w-[86vw] -translate-x-full shadow-2xl transition-transform duration-200 ease-out lg:hidden",
          isOpen ? "translate-x-0" : "",
        ].join(" ")}
      >
        <AppSidebar
          navId={navId}
          navAriaLabel={navAriaLabel}
          roleLabel={roleLabel}
          userEmail={userEmail}
          userRole={userRole}
          navItems={navItems}
          onLogout={onLogout}
          onClose={onClose}
          showCloseButton
        />
      </div>
    </>
  );
}

