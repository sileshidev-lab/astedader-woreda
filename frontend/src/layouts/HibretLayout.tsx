import { useCallback } from "react";
import {
  Bell,
  BookOpen,
  FolderOpen,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import {
  AdminShellLayout,
  type AdminShellHeaderInfo,
  type AdminShellNavItem,
} from "../components/layout/AdminShellLayout";

const navItems: AdminShellNavItem[] = [
  { label: "Announcements", path: "/hibret/announcements", icon: Bell, privileges: ["announcement.read"] },
  { label: "Users", path: "/hibret/users", icon: Users, privileges: ["member_account.read"] },
  { label: "Members", path: "/hibret/members", icon: Users, privileges: ["member.read"] },
  { label: "Resources", path: "/hibret/resources", icon: FolderOpen, privileges: ["resource.read"] },
  { label: "Broadcasts", path: "/hibret/broadcasts", icon: BookOpen, privileges: ["broadcast.read"] },
  { label: "Chat", path: "/hibret/chat", icon: MessageSquare, privileges: ["chat.read"] },
  { label: "Settings", path: "/hibret/settings", icon: Settings, privileges: ["profile.read", "profile.update"] },
];

export function HibretLayout() {
  const getPageHeader = useCallback((pathname: string): AdminShellHeaderInfo => {
    if (pathname.startsWith("/hibret/announcements")) {
      return {
        section: "Assigned directives",
        title: "Announcements",
        description: "Manage Hibret-facing directives using the unified admin shell.",
      };
    }

    if (pathname.startsWith("/hibret/users")) {
      return {
        section: "Access control",
        title: "Users",
        description: "Review and manage Hibret member account access.",
      };
    }

    if (pathname.startsWith("/hibret/members")) {
      return {
        section: "Membership registry",
        title: "Members",
        description: "Browse Hibret members inside the shared admin layout.",
      };
    }

    if (pathname.startsWith("/hibret/resources")) {
      return {
        section: "Resource library",
        title: "Resources",
        description: "Open Hibret resources with the same admin page structure.",
      };
    }

    if (pathname.startsWith("/hibret/broadcasts")) {
      return {
        section: "Communication",
        title: "Broadcasts",
        description: "Track Hibret broadcasts in the common admin workspace.",
      };
    }

    if (pathname.startsWith("/hibret/chat")) {
      return {
        section: "Communication",
        title: "Chat",
        description: "Stay in sync through the shared admin communication shell.",
      };
    }

    if (pathname.startsWith("/hibret/settings")) {
      return {
        section: "Account",
        title: "Settings",
        description: "Update Hibret account preferences in the admin shell.",
      };
    }

    return {
      section: "Hibret administration",
      title: "Administrative Console",
      description: "Hibret tools now use the same layout structure as the admin area.",
    };
  }, []);

  return (
    <AdminShellLayout
      roleLabel="Hibret Admin"
      navId="hibret-admin-nav"
      navAriaLabel="Hibret admin navigation"
      navItems={navItems}
      getPageHeader={getPageHeader}
    />
  );
}
