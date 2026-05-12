import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, getLanguageLabel, type SupportedLanguageCode } from "../../../i18n/languages";
import type { FormEvent } from "react";
import { KeyRound, Languages } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../../../stores/authStore";
import { changePassword } from "../../../services/authService";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";

export function SettingsPage() {
  const { i18n } = useTranslation();
  const { user, loadCurrentUser } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from the current password.");
      return;
    }

    setIsSavingPassword(true);

    try {
      const result = await changePassword(currentPassword, newPassword);

      toast.success(result.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await loadCurrentUser();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Unable to update password.";
      setPasswordError(message);
      toast.error(message);
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleLanguageChange(language: SupportedLanguageCode) {
    await i18n.changeLanguage(language);
    localStorage.setItem("astedader-language", language);
    toast.success(`Language changed to ${getLanguageLabel(language)}.`);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col space-y-6">
      <h1 className="sr-only">Account settings</h1>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Languages aria-hidden className="text-muted-foreground" />
              Language preference
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Choose the interface language for this browser.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {SUPPORTED_LANGUAGES.map((language) => {
              const active = i18n.language === language.code;
              return (
                <Button
                  key={language.code}
                  type="button"
                  variant={active ? "default" : "outline"}
                  onClick={() => void handleLanguageChange(language.code)}
                  className="h-auto min-h-12 flex-col items-start gap-1 py-3 text-left whitespace-normal"
                >
                  <span className="block text-sm font-medium">{language.nativeLabel}</span>
                  <span className="block text-xs font-normal opacity-75">{language.label}</span>
                </Button>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Current language: {getLanguageLabel(i18n.language)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Account</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Review account identity, access status, and password.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Detail label="Email" value={user?.email} />
            <Detail label="Role" value={user?.role} />
            <Detail label="Account status" value={user?.status} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <KeyRound aria-hidden className="text-muted-foreground" />
              Password
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Change your password using your current password.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="grid gap-4 sm:grid-cols-2">
            {passwordError ? (
              <p className="text-xs text-destructive sm:col-span-2" role="alert">
                {passwordError}
              </p>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-current-password">
                Current password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="settings-current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-start-1">
              <Label htmlFor="settings-new-password">
                New password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="settings-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-confirm-password">
                Confirm new password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="settings-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="flex justify-end pt-2 sm:col-span-2">
              <Button type="submit" disabled={isSavingPassword}>
                <KeyRound aria-hidden />
                {isSavingPassword ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {value === null || value === undefined || value === "" ? "-" : String(value)}
      </p>
    </div>
  );
}
