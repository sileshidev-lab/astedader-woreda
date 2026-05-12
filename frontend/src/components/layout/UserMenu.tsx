import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, LogOut, Moon, Settings, Sun, UserCircle2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import type { UserRole } from "@/types/auth";
import { Avatar, AvatarFallback } from "@/components/ui/shadcn/avatar";
import { Button } from "@/components/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";

function getInitials(source: string | null | undefined): string {
  const value = (source || "").trim();
  if (!value) return "U";

  const parts = value
    .replace(/[._-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function roleLabelFor(role: UserRole | undefined, t: (key: string) => string): string {
  if (role === "WOREDA_ADMIN") return t("layout.woreda.roleLabel") || "Woreda admin";
  if (role === "HIBRET_ADMIN") return "Hibret admin";
  if (role === "MEMBER") return "Member";
  return "—";
}

function profileRouteFor(role: UserRole | undefined): string {
  if (role === "WOREDA_ADMIN") return "/woreda/settings";
  if (role === "HIBRET_ADMIN") return "/hibret/settings";
  if (role === "MEMBER") return "/member/profile";
  return "/login";
}

function settingsRouteFor(role: UserRole | undefined): string {
  if (role === "WOREDA_ADMIN") return "/woreda/settings";
  if (role === "HIBRET_ADMIN") return "/hibret/settings";
  if (role === "MEMBER") return "/member/profile";
  return "/login";
}

export function UserMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  if (!user) return null;

  const displayName = user.memberName || user.email || "—";
  const role = user.role;
  const roleLabel = roleLabelFor(role, t);
  const initials = getInitials(user.memberName || user.email);

  function handleProfile() {
    navigate(profileRouteFor(role));
  }

  function handleSettings() {
    navigate(settingsRouteFor(role));
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={displayName}
          className="h-9 gap-2 px-1.5 hover:bg-[var(--aw-surface-muted)] focus-visible:ring-ring/35"
        >
          <Avatar className="h-7 w-7 rounded-full border border-[var(--aw-border)]">
            <AvatarFallback className="bg-[var(--aw-surface-muted)] text-[11px] font-medium text-[var(--aw-text)]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 flex-col items-start text-left leading-tight sm:flex">
            <span className="max-w-[160px] truncate text-[13px] font-medium text-[var(--aw-text)]">
              {displayName}
            </span>
            <span className="text-[11px] font-normal capitalize text-[var(--aw-muted)]">
              {roleLabel}
            </span>
          </div>
          <ChevronDown
            size={14}
            className="hidden text-[var(--aw-muted)] sm:inline-block"
            aria-hidden
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6} className="w-64">
        <DropdownMenuLabel className="px-3 py-2.5 normal-case tracking-normal">
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-[var(--aw-text)]">
              {displayName}
            </span>
            <span className="truncate text-xs font-normal text-[var(--aw-muted)]">
              {user.email}
            </span>
            <span className="mt-1 text-[11px] font-medium capitalize text-[var(--aw-muted)]">
              {roleLabel}
            </span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={handleProfile} className="cursor-pointer">
          <UserCircle2 className="text-[var(--aw-muted)]" aria-hidden />
          <span>{t("common.myProfile")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={handleSettings} className="cursor-pointer">
          <Settings className="text-[var(--aw-muted)]" aria-hidden />
          <span>{t("sidebar.settings")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            toggleTheme();
          }}
          className="cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="text-[var(--aw-muted)]" aria-hidden />
          ) : (
            <Moon className="text-[var(--aw-muted)]" aria-hidden />
          )}
          <span>
            {theme === "dark" ? t("auth.switchToLight") : t("auth.switchToDark")}
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={handleLogout}
          className="cursor-pointer text-[var(--aw-danger)] focus:text-[var(--aw-danger)]"
        >
          <LogOut aria-hidden />
          <span>{t("common.logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
