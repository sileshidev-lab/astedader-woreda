import { useCallback } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  FolderOpen,
  Image,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  Users,
  Workflow,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AdminShellLayout,
  type AdminShellHeaderInfo,
  type AdminShellNavItem,
} from "./AdminShellLayout";
import { useWoredaHibretDetailHeaderStore } from "../../stores/woredaHibretDetailHeaderStore";

const navItems: AdminShellNavItem[] = [
  { label: "Dashboard", path: "/woreda/dashboard", icon: LayoutDashboard, privileges: ["analytics.read", "woreda_analytics.read"] },
  { label: "Announcements", path: "/woreda/announcements", icon: Bell, privileges: ["announcement.read"] },
  { label: "Hibrets", path: "/woreda/hibrets", icon: Workflow, privileges: ["hibret.read"] },
  { label: "Users", path: "/woreda/users", icon: Users, privileges: ["member_account.read"] },
  { label: "Members", path: "/woreda/members", icon: Users, privileges: ["member.read"] },
  { label: "Admins", path: "/woreda/admins", icon: Shield, privileges: ["admin.read"] },
  { label: "Resources", path: "/woreda/resources", icon: FolderOpen, privileges: ["resource.read"] },
  { label: "Gallery", path: "/woreda/gallery", icon: Image, privileges: ["gallery.read"] },
  { label: "Broadcasts", path: "/woreda/broadcasts", icon: BookOpen, privileges: ["broadcast.read"] },
  { label: "Chat", path: "/woreda/chat", icon: MessageSquare, privileges: ["chat.read"] },
  { label: "Activity", path: "/woreda/activity", icon: Activity, privileges: ["activity.read"] },
  { label: "Settings", path: "/woreda/settings", icon: Settings, privileges: ["profile.read", "profile.update"] },
];

function isWoredaHibretDetailRoute(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || pathname;
  if (!normalized.startsWith("/woreda/hibrets/")) return false;
  const rest = normalized.slice("/woreda/hibrets/".length);
  return rest.length > 0 && !rest.includes("/");
}

function shouldLockPageScroll(pathname: string) {
  return (
    pathname.startsWith("/woreda/announcements/") ||
    pathname.includes("/report-review") ||
    pathname.includes("/reports/")
  );
}

export function WoredaLayout() {
  const { t } = useTranslation();
  const hibretDetailTitle = useWoredaHibretDetailHeaderStore((state) => state.detailTitle);

  const getPageHeader = useCallback(
    (pathname: string): AdminShellHeaderInfo => {
      if (isWoredaHibretDetailRoute(pathname) && hibretDetailTitle) {
        return {
          section: t("layout.woreda.sections.community"),
          title: hibretDetailTitle,
          description: t("layout.woreda.descriptions.hibrets"),
        };
      }

      if (pathname.startsWith("/woreda/dashboard") || pathname === "/woreda") {
        return {
          section: t("layout.woreda.sections.console"),
          title: t("sidebar.dashboard"),
          description: t("topbar.dashboardSubtitle"),
        };
      }

      if (pathname.startsWith("/woreda/announcements")) {
        return {
          section: t("layout.woreda.sections.directives"),
          title: t("sidebar.announcements"),
          description: t("layout.woreda.descriptions.directives"),
        };
      }

      if (pathname.startsWith("/woreda/hibrets")) {
        return {
          section: t("layout.woreda.sections.community"),
          title: t("sidebar.hibrets"),
          description: t("layout.woreda.descriptions.hibrets"),
        };
      }

      if (pathname.startsWith("/woreda/users")) {
        return {
          section: t("layout.woreda.sections.access"),
          title: t("sidebar.users"),
          description: t("layout.woreda.descriptions.users"),
        };
      }

      if (pathname.startsWith("/woreda/members")) {
        return {
          section: t("layout.woreda.sections.membership"),
          title: t("sidebar.members"),
          description: t("layout.woreda.descriptions.members"),
        };
      }

      if (pathname.startsWith("/woreda/admins")) {
        return {
          section: t("layout.woreda.sections.access"),
          title: t("sidebar.admins"),
          description: t("layout.woreda.descriptions.admins"),
        };
      }

      if (pathname.startsWith("/woreda/resources")) {
        return {
          section: t("layout.woreda.sections.resources"),
          title: t("sidebar.resources"),
          description: t("layout.woreda.descriptions.resources"),
        };
      }

      if (pathname.startsWith("/woreda/gallery")) {
        return {
          section: t("layout.woreda.sections.gallery"),
          title: t("sidebar.gallery"),
          description: t("layout.woreda.descriptions.gallery"),
        };
      }

      if (pathname.startsWith("/woreda/broadcasts")) {
        return {
          section: t("layout.woreda.sections.communication"),
          title: t("sidebar.broadcasts"),
          description: t("layout.woreda.descriptions.broadcasts"),
        };
      }

      if (pathname.startsWith("/woreda/chat")) {
        return {
          section: t("layout.woreda.sections.communication"),
          title: t("sidebar.chat"),
          description: t("layout.woreda.descriptions.chat"),
        };
      }

      if (pathname.startsWith("/woreda/activity")) {
        return {
          section: t("layout.woreda.sections.monitoring"),
          title: t("sidebar.activity"),
          description: t("layout.woreda.descriptions.activity"),
        };
      }

      if (pathname.startsWith("/woreda/settings")) {
        return {
          section: t("layout.woreda.sections.account"),
          title: t("sidebar.settings"),
          description: t("layout.woreda.descriptions.settings"),
        };
      }

      return {
        section: t("layout.woreda.sections.console"),
        title: t("layout.woreda.consoleTitle"),
        description: t("layout.woreda.consoleDescription"),
      };
    },
    [hibretDetailTitle, t]
  );

  return (
    <AdminShellLayout
      roleLabel={t("layout.woreda.roleLabel")}
      navId="woreda-admin-nav"
      navAriaLabel="Woreda admin navigation"
      navItems={navItems}
      getPageHeader={getPageHeader}
      lockPageScroll={shouldLockPageScroll}
    />
  );
}
