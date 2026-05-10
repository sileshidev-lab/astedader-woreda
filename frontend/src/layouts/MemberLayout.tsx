import { useCallback } from "react";
import { BookOpen, FolderOpen, Settings, UserCircle } from "lucide-react";
import {
  AdminShellLayout,
  type AdminShellHeaderInfo,
  type AdminShellNavItem,
} from "../components/layout/AdminShellLayout";

const navItems: AdminShellNavItem[] = [
  { label: "Broadcasts", path: "/member/broadcasts", icon: BookOpen, privileges: ["broadcast.read"] },
  { label: "Resources", path: "/member/resources", icon: FolderOpen, privileges: ["resource.read"] },
  { label: "Profile", path: "/member/profile", icon: UserCircle, privileges: ["profile.read"] },
  { label: "Settings", path: "/member/settings", icon: Settings, privileges: ["profile.read"] },
];

export function MemberLayout() {
  const getPageHeader = useCallback((pathname: string): AdminShellHeaderInfo => {
    if (pathname.startsWith("/member/broadcasts")) {
      return {
        section: "Communication",
        title: "Broadcasts",
        description: "Member broadcasts now sit inside the shared admin page frame.",
      };
    }

    if (pathname.startsWith("/member/resources")) {
      return {
        section: "Resource library",
        title: "Resources",
        description: "Browse member resources with the same navigation and spacing as admin pages.",
      };
    }

    if (pathname.startsWith("/member/profile")) {
      return {
        section: "Member profile",
        title: "Profile",
        description: "Personal profile tools are now presented in the common admin shell.",
      };
    }

    if (pathname.startsWith("/member/settings")) {
      return {
        section: "Account",
        title: "Settings",
        description: "Manage member preferences using the unified admin layout.",
      };
    }

    return {
      section: "Member workspace",
      title: "Member Portal",
      description: "Member pages now follow the same top bar and sidebar structure as admin pages.",
    };
  }, []);

  return (
    <AdminShellLayout
      roleLabel="Member"
      navId="member-admin-nav"
      navAriaLabel="Member navigation"
      navItems={navItems}
      getPageHeader={getPageHeader}
    />
  );
}
