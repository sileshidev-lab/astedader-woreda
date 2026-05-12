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
          className="fixed inset-0 z-[300] backdrop-blur-sm lg:hidden"
          style={{ background: "var(--overlay-scrim)" }}
          onClick={onClose}
        />
      ) : null}

      <div
        className={[
          "fixed inset-y-0 left-0 z-[400] h-[100dvh] w-[var(--aw-sidebar-w)] max-w-[86vw] -translate-x-full transition-transform duration-base ease-standard lg:hidden",
          isOpen ? "translate-x-0" : "",
        ].join(" ")}
        style={{ boxShadow: "var(--aw-shadow-lg)" }}
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
