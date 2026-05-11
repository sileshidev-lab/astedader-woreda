import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { AuthShell } from "./AuthShell";
import { useThemeStore } from "../../stores/themeStore";
import { AUTH_SPLIT_HERO_IMAGES } from "./authHeroImages";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSending(true);

    try {
      const response = await apiClient.post<{ message: string }>("/auth/forgot-password", {
        email: email.trim(),
      });
      setMessage(response.data.message || t("auth.resetSent"));
    } catch (err: any) {
      setError(err?.response?.data?.message || t("auth.resetSendFailed"));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AuthShell variant="split" splitPhotoUrls={AUTH_SPLIT_HERO_IMAGES}>
      <button
        type="button"
        className="aw-auth-theme-toggle"
        onClick={toggleTheme}
        title={theme === "dark" ? t("auth.switchToLight") : t("auth.switchToDark")}
        aria-label={theme === "dark" ? t("auth.switchToLight") : t("auth.switchToDark")}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <form onSubmit={handleSubmit} className="aw-auth-form" aria-label={t("auth.forgotPasswordForm")}>
        <Link to="/login" className="aw-auth-back">
          <ArrowLeft size={16} />
          {t("auth.backToLogin")}
        </Link>

        <div className="aw-auth-logo">
          <img src="/Prosperity_Party_logo.png" alt="Prosperity Party" />
        </div>

        <p className="aw-auth-form-note">{t("auth.recoverInstruction")}</p>

        {error ? (
          <div className="aw-auth-alert aw-auth-alert-error" role="alert">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="aw-auth-alert aw-auth-alert-success" role="status">
            {message}
          </div>
        ) : null}

        <label className="aw-auth-field" htmlFor="forgot-email">
          <span>{t("auth.emailAddress")}</span>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            aria-invalid={Boolean(error)}
          />
        </label>

        <button type="submit" disabled={isSending} className="aw-auth-submit">
          {isSending ? t("auth.sending") : t("auth.sendResetLink")}
        </button>
      </form>
    </AuthShell>
  );
}
