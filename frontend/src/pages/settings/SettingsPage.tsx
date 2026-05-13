import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, getLanguageLabel, type SupportedLanguageCode } from "../../i18n/languages";
import type { FormEvent } from "react";
import { KeyRound, Languages, User } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { apiClient } from "../../services/apiClient";

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

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault(); setPasswordMessage(""); setPasswordError("");
    if (newPassword.length < 8) { setPasswordError("Password too short."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return; }
    setIsSavingPassword(true);
    try {
      const res = await apiClient.post("/auth/change-password", { currentPassword, newPassword });
      setPasswordMessage(res.data.message || "Updated successfully.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      await loadCurrentUser();
    } catch (err: any) { setPasswordError(err?.response?.data?.message || "Update failed."); }
    finally { setIsSavingPassword(false); }
  }

  async function handleLanguageChange(lang: SupportedLanguageCode) {
    await i18n.changeLanguage(lang);
    localStorage.setItem("astedader-language", lang);
    setLanguageMessage(`Language changed to ${getLanguageLabel(lang)}.`);
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <section className="aw-panel shadow-soft overflow-hidden">
        <header className="aw-panel-header !bg-[var(--aw-surface)] !py-6">
          <div className="min-w-0">
             <h2 className="aw-panel-title flex items-center gap-2"><Languages size={20} className="text-[var(--aw-primary)]"/>Language Preference</h2>
             <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Choose your preferred interface language.</p>
          </div>
        </header>
        <div className="p-6">
           {languageMessage && <div className="mb-6 aw-panel !bg-[var(--aw-primary-soft)]/20 !border-[var(--aw-primary)] p-4 text-xs font-black text-[var(--aw-primary)]">{languageMessage}</div>}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SUPPORTED_LANGUAGES.map(l => (
                <button key={l.code} onClick={() => void handleLanguageChange(l.code)} className={["p-5 rounded-2xl border text-left transition-all", i18n.language === l.code ? "border-[var(--aw-primary)] bg-[var(--aw-primary-soft)]/20 shadow-sm" : "border-[var(--aw-border-soft)] bg-[var(--aw-surface)] hover:border-[var(--aw-primary)]/50"].join(" ")}>
                   <p className={["font-black text-sm", i18n.language === l.code ? "text-[var(--aw-primary)]" : "text-[var(--aw-text)]"].join(" ")}>{l.nativeLabel}</p>
                   <p className="text-[10px] font-bold text-[var(--aw-muted)] uppercase tracking-wider mt-1">{l.label}</p>
                </button>
              ))}
           </div>
        </div>
      </section>

      <section className="aw-panel shadow-soft overflow-hidden">
        <header className="aw-panel-header !bg-[var(--aw-surface)] !py-6">
          <div className="min-w-0">
             <h2 className="aw-panel-title flex items-center gap-2"><User size={20} className="text-[var(--aw-primary)]"/>Account Identity</h2>
             <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Your registered system identifiers and role.</p>
          </div>
        </header>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="p-5 bg-[var(--aw-bg)] rounded-2xl border border-[var(--aw-border-soft)]">
              <p className="text-[10px] font-black uppercase text-[var(--aw-muted)] mb-2">Email Address</p>
              <p className="text-sm font-black">{user?.email}</p>
           </div>
           <div className="p-5 bg-[var(--aw-bg)] rounded-2xl border border-[var(--aw-border-soft)]">
              <p className="text-[10px] font-black uppercase text-[var(--aw-muted)] mb-2">System Role</p>
              <p className="text-sm font-black">{user?.role?.replace('_', ' ')}</p>
           </div>
           <div className="p-5 bg-[var(--aw-bg)] rounded-2xl border border-[var(--aw-border-soft)]">
              <p className="text-[10px] font-black uppercase text-[var(--aw-muted)] mb-2">Account Status</p>
              <span className="inline-flex rounded-full border border-[var(--aw-success)]/20 bg-[var(--aw-success-bg)] px-2.5 py-0.5 text-[10px] font-black uppercase text-[var(--aw-success)]">{user?.status}</span>
           </div>
        </div>
      </section>

      <section className="aw-panel shadow-soft overflow-hidden">
        <header className="aw-panel-header !bg-[var(--aw-surface)] !py-6">
          <div className="min-w-0">
             <h2 className="aw-panel-title flex items-center gap-2"><KeyRound size={20} className="text-[var(--aw-primary)]"/>Security & Password</h2>
             <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Change your account password below.</p>
          </div>
        </header>
        <form onSubmit={handleChangePassword} className="p-8 space-y-6">
           {passwordError && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] p-4 text-xs font-black text-[var(--aw-danger)]">{passwordError}</div>}
           {passwordMessage && <div className="aw-panel !bg-[var(--aw-primary-soft)]/20 !border-[var(--aw-primary)] p-4 text-xs font-black text-[var(--aw-primary)]">{passwordMessage}</div>}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="aw-form-field"><label className="aw-form-label">Current Password</label><input required type="password" underline-offset-4 className="aw-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div>
              <div className="aw-form-field"><label className="aw-form-label">New Password</label><input required type="password" minLength={8} className="aw-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
              <div className="aw-form-field md:col-start-2"><label className="aw-form-label">Confirm New Password</label><input required type="password" minLength={8} className="aw-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
           </div>

           <div className="flex justify-end pt-4 border-t border-[var(--aw-border-soft)]">
              <button type="submit" disabled={isSavingPassword} className="aw-btn aw-btn-primary min-w-[180px] shadow-lg"><KeyRound size={18}/>{isSavingPassword ? 'Saving...' : 'Update Password'}</button>
           </div>
        </form>
      </section>
    </div>
  );
}
