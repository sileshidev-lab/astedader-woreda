import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";
import { AuthShell } from "./AuthShell";
import { AUTH_SPLIT_HERO_IMAGES } from "./authHeroImages";

function destinationForRole(role?: string) {
  if (role === "WOREDA_ADMIN") return "/woreda/dashboard";
  if (role === "HIBRET_ADMIN") return "/hibret/announcements";
  if (role === "MEMBER") return "/member/broadcasts";
  return "/login";
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { login, completeTwoFactorLogin, isAuthenticated, isLoading, user } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to={destinationForRole(user?.role)} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      const result = await login(email.trim(), password);

      if (result && "twoFactorRequired" in result && result.twoFactorRequired) {
        setTwoFactorToken(result.twoFactorToken);
        setNotice(result.message || t("auth.twoFactorSent"));
        setCode("");
        return;
      }

      navigate(destinationForRole(useAuthStore.getState().user?.role), { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || t("auth.loginFailed"));
    }
  }

  async function handleTwoFactorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await completeTwoFactorLogin(twoFactorToken, code.trim());
      navigate(destinationForRole(useAuthStore.getState().user?.role), { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || t("auth.invalidCode"));
    }
  }

  const forgotPasswordPath = `/forgot-password${
    email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""
  }`;

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

      {!twoFactorToken ? (
        <form onSubmit={handleSubmit} className="aw-auth-form" aria-label={t("auth.signInForm")}>
          <div className="aw-auth-logo">
            <img src="/Prosperity_Party_logo.png" alt="Prosperity Party" />
          </div>

          {error ? (
            <div className="aw-auth-alert aw-auth-alert-error" role="alert">
              {error}
            </div>
          ) : null}

          <label className="aw-auth-field" htmlFor="login-email">
            <span>{t("auth.emailAddress")}</span>
            <input
              id="login-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              aria-invalid={Boolean(error)}
            />
          </label>

          <label className="aw-auth-field" htmlFor="login-password">
            <span>{t("auth.password")}</span>
            <div className="aw-auth-password-wrap">
              <input
                id="login-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder={t("auth.passwordPlaceholder")}
                aria-invalid={Boolean(error)}
              />
              <button
                type="button"
                className="aw-auth-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="aw-auth-row">
            <Link to={forgotPasswordPath} className="aw-auth-link">
              {t("auth.forgotPassword")}
            </Link>
          </div>

          <button disabled={isLoading} className="aw-auth-submit" type="submit">
            {isLoading ? t("auth.signingIn") : t("auth.signIn")}
          </button>
        </form>
      ) : (
        <form onSubmit={handleTwoFactorSubmit} className="aw-auth-form" aria-label={t("auth.verificationForm")}>
          <button
            type="button"
            className="aw-auth-back"
            onClick={() => {
              setTwoFactorToken("");
              setCode("");
              setError("");
              setNotice("");
            }}
          >
            <ArrowLeft size={16} />
            {t("auth.backToPassword")}
          </button>

          <div className="aw-auth-logo">
            <img src="/Prosperity_Party_logo.png" alt="Prosperity Party" />
          </div>

          <p className="aw-auth-form-note">{t("auth.twoFactorInstruction")}</p>

          {notice ? (
            <div className="aw-auth-alert aw-auth-alert-info" role="status">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="aw-auth-alert aw-auth-alert-error" role="alert">
              {error}
            </div>
          ) : null}

          <label className="aw-auth-field" htmlFor="login-otp">
            <span>{t("auth.verificationCode")}</span>
            <input
              id="login-otp"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoFocus
              required
              placeholder={t("auth.codePlaceholder")}
              aria-invalid={Boolean(error)}
            />
          </label>

          <button disabled={isLoading} className="aw-auth-submit" type="submit">
            {isLoading ? t("auth.verifying") : t("auth.verifyAndSignIn")}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
