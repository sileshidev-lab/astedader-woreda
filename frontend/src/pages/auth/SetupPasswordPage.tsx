import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { setupAccount } from "../../services/authService";
import { useAuthStore } from "../../stores/authStore";
import { AuthShell } from "./AuthShell";
import { useThemeStore } from "../../stores/themeStore";
import { AUTH_SPLIT_HERO_IMAGES } from "./authHeroImages";

function destinationForRole(role?: string) {
  if (role === "WOREDA_ADMIN") return "/woreda/dashboard";
  if (role === "HIBRET_ADMIN") return "/hibret/announcements";
  if (role === "MEMBER") return "/member/broadcasts";
  return "/login";
}

export function SetupPasswordPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("Account setup token is missing. Please use the link from your email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirmation do not match.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await setupAccount(token, password);
      setMessage("Account activated successfully. Signing you in...");
      setPassword("");
      setConfirmPassword("");

      useAuthStore.getState().applySession(result.token, result.user);

      const destination = destinationForRole(result.user.role);
      setTimeout(() => navigate(destination, { replace: true }), 600);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to activate account. The link may be expired or already used.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AuthShell variant="split" splitPhotoUrls={AUTH_SPLIT_HERO_IMAGES}>
      <button
        type="button"
        className="aw-auth-theme-toggle"
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <form onSubmit={handleSubmit} className="aw-auth-form" aria-label="Account setup form">
        <Link to="/login" className="aw-auth-back">
          <ArrowLeft size={16} />
          Back to login
        </Link>

        <div className="aw-auth-logo">
          <img src="/Prosperity_Party_logo.png" alt="Prosperity Party" />
        </div>

        <p className="aw-auth-form-note">Create a password from your invitation link. Minimum 8 characters.</p>

        {!token ? <div className="aw-auth-alert aw-auth-alert-error" role="alert">Account setup token is missing. Open this page using the link sent to your email.</div> : null}
        {error ? <div className="aw-auth-alert aw-auth-alert-error" role="alert">{error}</div> : null}
        {message ? <div className="aw-auth-alert aw-auth-alert-success" role="status">{message}</div> : null}

        <PasswordField
          id="setup-password"
          label="Password"
          value={password}
          onChange={setPassword}
          show={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
          placeholder="At least 8 characters"
        />

        <PasswordField
          id="setup-password-confirm"
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showConfirm}
          onToggle={() => setShowConfirm((value) => !value)}
          placeholder="Re-enter password"
        />

        <button type="submit" disabled={isSaving || !token} className="aw-auth-submit">
          {isSaving ? "Activating..." : "Activate account"}
        </button>
      </form>
    </AuthShell>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <label className="aw-auth-field" htmlFor={id}>
      <span>{label}</span>
      <div className="aw-auth-password-wrap">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder={placeholder}
        />
        <button type="button" className="aw-auth-password-toggle" onClick={onToggle} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
