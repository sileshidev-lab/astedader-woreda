import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, getLanguageLabel, type SupportedLanguageCode } from "../../../i18n/languages";
import type { FormEvent } from "react";
import { KeyRound, Languages } from "lucide-react";
import { useAuthStore } from "../../../stores/authStore";
import { apiClient } from "../../../services/apiClient";

export function SettingsPage() {
  const { i18n } = useTranslation();
  const { user, loadCurrentUser } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [languageMessage, setLanguageMessage] = useState("");

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPasswordMessage("");
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
      const response = await apiClient.post<{ message: string }>("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      setPasswordMessage(response.data.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await loadCurrentUser();
    } catch (error: any) {
      setPasswordError(error?.response?.data?.message || "Unable to update password.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleLanguageChange(language: SupportedLanguageCode) {
    await i18n.changeLanguage(language);
    localStorage.setItem("astedader-language", language);
    setLanguageMessage(`Language changed to ${getLanguageLabel(language)}.`);
  }

  return (
    <section className="aw-design-page aw-mobile-page aw-settings-page flex min-h-0 flex-1 flex-col gap-4 sm:gap-6">
      <h1 className="sr-only">Account settings</h1>

      <section className="aw-panel min-h-0 shadow-none">
        <header className="border-b-2 border-woreda-borderLight bg-woreda-surfaceLow px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex items-start gap-2 sm:items-center">
            <span className="mt-1 h-5 w-1 shrink-0 bg-woreda-yellow sm:mt-0" aria-hidden />
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-lg font-black text-woreda-text sm:text-xl">
                <Languages size={18} />
                Language preference
              </h2>
              <p className="mt-1 text-sm font-semibold text-woreda-textMuted">
                Choose the interface language for this browser.
              </p>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-5">
          {languageMessage ? (
            <div className="mb-4 border border-woreda-success bg-woreda-successBg px-4 py-3 text-sm font-semibold text-woreda-success">
              {languageMessage}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {SUPPORTED_LANGUAGES.map((language) => (
              <button
                key={language.code}
                type="button"
                onClick={() => void handleLanguageChange(language.code)}
                className={[
                  "min-h-12 border px-4 py-3 text-left text-sm font-black",
                  i18n.language === language.code
                    ? "border-woreda-primary bg-woreda-primary text-white"
                    : "border-woreda-border bg-woreda-surface text-woreda-text hover:border-woreda-primary hover:text-woreda-primary",
                ].join(" ")}
              >
                <span className="block">{language.nativeLabel}</span>
                <span className="mt-1 block text-xs font-semibold opacity-75">{language.label}</span>
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs font-semibold text-woreda-textMuted">
            Current language: {getLanguageLabel(i18n.language)}
          </p>
        </div>
      </section>

      <section className="aw-panel min-h-0 shadow-none">
        <header className="border-b-2 border-woreda-borderLight bg-woreda-surfaceLow px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex items-start gap-2 sm:items-center">
            <span className="mt-1 h-5 w-1 shrink-0 bg-woreda-yellow sm:mt-0" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-lg font-black text-woreda-text sm:text-xl">Account</h2>
              <p className="mt-1 text-sm font-semibold text-woreda-textMuted">
                Review account identity, access status, and password.
              </p>
            </div>
          </div>
        </header>

        <div className="form-grid p-4 sm:p-5">
          <Detail label="Email" value={user?.email} />
          <Detail label="Role" value={user?.role} />
          <Detail label="Account status" value={user?.status} />
        </div>
      </section>

      <section className="aw-panel min-h-0 shadow-none">
        <header className="border-b-2 border-woreda-borderLight bg-woreda-surfaceLow px-4 py-4 sm:px-5">
          <div className="flex items-start gap-2 sm:items-center">
            <KeyRound size={20} className="mt-0.5 shrink-0 text-woreda-primary sm:mt-0" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-lg font-black text-woreda-text sm:text-xl">Password</h2>
              <p className="mt-1 text-sm font-semibold text-woreda-textMuted">
                Change your password using your current password.
              </p>
            </div>
          </div>
        </header>

        <form onSubmit={handleChangePassword} className="form-grid p-4 sm:p-5">
          {passwordError ? (
            <div className="border border-woreda-danger bg-woreda-dangerBg px-4 py-3 text-sm font-semibold text-woreda-danger form-field-full">
              {passwordError}
            </div>
          ) : null}

          {passwordMessage ? (
            <div className="border border-woreda-success/20 bg-woreda-successBg px-4 py-3 text-sm font-semibold text-woreda-success form-field-full">
              {passwordMessage}
            </div>
          ) : null}

          <label className="block min-w-0">
            <span className="text-sm font-black text-woreda-text">Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="mt-2 min-h-11 w-full max-w-full border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary"
            />
          </label>

          <label className="block min-w-0">
            <span className="text-sm font-black text-woreda-text">New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-2 min-h-11 w-full max-w-full border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary"
            />
          </label>

          <label className="block min-w-0">
            <span className="text-sm font-black text-woreda-text">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-2 min-h-11 w-full max-w-full border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary"
            />
          </label>

          <div className="flex flex-wrap justify-end gap-3 border-t border-woreda-borderLight pt-4 form-field-full">
            <button
              type="submit"
              disabled={isSavingPassword}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-woreda-primary bg-woreda-primary px-5 py-2.5 text-sm font-black text-white hover:bg-woreda-sidebar sm:w-auto sm:min-w-[12rem] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound size={16} />
              {isSavingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="field-pair bg-woreda-surfaceLow">
      <p className="field-label">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-woreda-text">
        {value === null || value === undefined || value === "" ? "-" : String(value)}
      </p>
    </div>
  );
}
