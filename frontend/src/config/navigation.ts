import type { LucideIcon } from "lucide-react";
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
import type { UserRole } from "../types/auth";

export type AppNavItem = {
  labelKey: string;
  path: string;
  icon: LucideIcon;
  privileges: string[];
};

export function navigationForRole(role: UserRole): AppNavItem[] {
  if (role === "WOREDA_ADMIN") {
    return [
      { labelKey: "sidebar.dashboard", path: "/woreda/dashboard", icon: LayoutDashboard, privileges: ["announcement.read"] },
      { labelKey: "sidebar.announcements", path: "/woreda/announcements", icon: Bell, privileges: ["announcement.read"] },
      { labelKey: "sidebar.hibrets", path: "/woreda/hibrets", icon: Workflow, privileges: ["hibret.read"] },
      { labelKey: "sidebar.users", path: "/woreda/users", icon: Users, privileges: ["member_account.read"] },
      { labelKey: "sidebar.members", path: "/woreda/members", icon: Users, privileges: ["member.read"] },
      { labelKey: "sidebar.admins", path: "/woreda/admins", icon: Shield, privileges: ["admin.read"] },
      { labelKey: "sidebar.resources", path: "/woreda/resources", icon: FolderOpen, privileges: ["resource.read"] },
      { labelKey: "sidebar.gallery", path: "/woreda/gallery", icon: Image, privileges: ["gallery.read"] },
      { labelKey: "sidebar.broadcasts", path: "/woreda/broadcasts", icon: BookOpen, privileges: ["broadcast.read"] },
      { labelKey: "sidebar.chat", path: "/woreda/chat", icon: MessageSquare, privileges: ["chat.read"] },
      { labelKey: "sidebar.activity", path: "/woreda/activity", icon: Activity, privileges: ["activity.read"] },
      { labelKey: "sidebar.settings", path: "/woreda/settings", icon: Settings, privileges: ["profile.read", "profile.update"] },
    ];
  }

  if (role === "HIBRET_ADMIN") {
    return [
      { labelKey: "sidebar.announcements", path: "/hibret/announcements", icon: Bell, privileges: ["announcement.read"] },
      { labelKey: "sidebar.users", path: "/hibret/users", icon: Users, privileges: ["member_account.read"] },
      { labelKey: "sidebar.members", path: "/hibret/members", icon: Users, privileges: ["member.read"] },
      { labelKey: "sidebar.resources", path: "/hibret/resources", icon: FolderOpen, privileges: ["resource.read"] },
      { labelKey: "sidebar.broadcasts", path: "/hibret/broadcasts", icon: BookOpen, privileges: ["broadcast.read"] },
      { labelKey: "sidebar.chat", path: "/hibret/chat", icon: MessageSquare, privileges: ["chat.read"] },
      { labelKey: "sidebar.settings", path: "/hibret/settings", icon: Settings, privileges: ["profile.read", "profile.update"] },
    ];
  }

  return [
    { labelKey: "sidebar.broadcasts", path: "/member/broadcasts", icon: BookOpen, privileges: ["broadcast.read"] },
    { labelKey: "sidebar.resources", path: "/member/resources", icon: FolderOpen, privileges: ["resource.read"] },
    { labelKey: "sidebar.profile", path: "/member/profile", icon: Users, privileges: ["profile.read"] },
    { labelKey: "sidebar.settings", path: "/member/settings", icon: Settings, privileges: ["profile.read"] },
  ];
}

