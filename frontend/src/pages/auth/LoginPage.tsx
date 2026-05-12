import { useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Moon, Sun, ShieldCheck } from "lucide-react";
import {
  DEMO_CREDENTIALS,
  isDevBypassLoginEnabled,
  isDevPrefillEnabled,
} from "../../services/runtimeConfig";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import type { UserRole } from "../../types/auth";
import { AuthShell } from "./AuthShell";
import { AUTH_SPLIT_HERO_IMAGES } from "./authHeroImages";
import { Button } from "@/components/ui/shadcn/button";

function destinationForRole(role?: string) {
  if (role === "WOREDA_ADMIN") return "/woreda/dashboard";
  if (role === "HIBRET_ADMIN") return "/hibret/announcements";
  if (role === "MEMBER") return "/member/broadcasts";
  return "/login";
}

function readErrorMessage(error: unknown): string | undefined {
  const err = error as { response?: { data?: { message?: unknown } } } | null | undefined;
  const message = err?.response?.data?.message;
  return typeof message === "string" ? message : undefined;
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { login, completeTwoFactorLogin, isAuthenticated, isLoading, user } = useAuthStore();

  const devBypassEnabled = isDevBypassLoginEnabled();
  const devPrefillEnabled = isDevPrefillEnabled();
  const defaultRole: UserRole = "WOREDA_ADMIN";
  const defaultDemo = DEMO_CREDENTIALS[defaultRole];
  const shouldPrefill = devBypassEnabled || devPrefillEnabled;

  const [email, setEmail] = useState(shouldPrefill ? defaultDemo.email : "");
  const [password, setPassword] = useState(shouldPrefill ? defaultDemo.password : "");
  const [mockRole, setMockRole] = useState<UserRole>(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [notice, setNotice] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  function applyDemoCredentials(role: UserRole) {
    const demo = DEMO_CREDENTIALS[role];
    setMockRole(role);
    setEmail(demo.email);
    setPassword(demo.password);
    setError("");
    setNotice("");
    setPreviewUrl(null);
  }

  async function handleQuickDemoLogin(role: UserRole) {
    if (!devBypassEnabled) return;

    const demo = DEMO_CREDENTIALS[role];
    setMockRole(role);
    setEmail(demo.email);
    setPassword(demo.password);
    setError("");
    setNotice("");
    setPreviewUrl(null);

    try {
      await login(demo.email, demo.password, { mockRole: role });
      navigate(destinationForRole(useAuthStore.getState().user?.role), { replace: true });
    } catch (err) {
      setError(readErrorMessage(err) || t("auth.loginFailed"));
    }
  }

  if (isAuthenticated) {
    return <Navigate to={destinationForRole(user?.role)} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setPreviewUrl(null);

    try {
      const result = await login(email.trim(), password, {
        mockRole: devBypassEnabled ? mockRole : undefined,
      });

      if (result && "twoFactorRequired" in result && result.twoFactorRequired) {
        setTwoFactorToken(result.twoFactorToken);
        setNotice(result.message || t("auth.twoFactorSent"));
        setPreviewUrl(result.previewUrl ?? null);
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

          <header className="aw-auth-form-heading">
            <p className="aw-auth-form-eyebrow">{t("auth.authorizedAccess")}</p>
            <h1>{t("auth.administrativePortal")}</h1>
            <p className="aw-auth-form-note">{t("auth.issuedCredentials")}</p>
          </header>

          {devBypassEnabled ? (
            <div className="aw-auth-demo-banner" role="note">
              <div className="aw-auth-demo-banner-head">
                <ShieldCheck size={13} aria-hidden />
                <span>{t("auth.demoMode.title")}</span>
              </div>
              <div className="aw-auth-demo-banner-actions">
                {(Object.keys(DEMO_CREDENTIALS) as UserRole[]).map((role) => (
                  <Button
                    key={role}
                    type="button"
                    size="sm"
                    variant={mockRole === role ? "default" : "outline"}
                    onClick={() => void handleQuickDemoLogin(role)}
                    disabled={isLoading}
                    className="h-7 rounded-full px-2.5 text-xs font-medium"
                  >
                    {DEMO_CREDENTIALS[role].label}
                  </Button>
                ))}
              </div>
              <p className="aw-auth-demo-banner-hint">
                {t("auth.demoMode.hint")}
              </p>
            </div>
          ) : null}

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

          {devBypassEnabled ? (
            <label className="aw-auth-field" htmlFor="login-dev-role">
              <span>Demo role</span>
              <select
                id="login-dev-role"
                value={mockRole}
                onChange={(event) => applyDemoCredentials(event.target.value as UserRole)}
                aria-label="Demo role"
              >
                <option value="WOREDA_ADMIN">Woreda Admin</option>
                <option value="HIBRET_ADMIN">Hibret Admin</option>
                <option value="MEMBER">Member</option>
              </select>
            </label>
          ) : null}

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
              setPreviewUrl(null);
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
              <span>{notice}</span>
              {previewUrl ? (
                <>
                  {" "}
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aw-auth-link"
                  >
                    {t("auth.openTestInbox")}
                  </a>
                </>
              ) : null}
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
