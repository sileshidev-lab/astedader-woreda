import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export function UnauthorizedPage() {
  const { t } = useTranslation();

  return (
    <main className="aw-auth-page aw-auth-simple-page">
      <section className="aw-auth-simple-card relative overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
          style={{
            background:
              "linear-gradient(90deg, var(--aw-primary-strong) 0%, var(--aw-primary) 28%, var(--aw-accent) 60%, var(--aw-primary) 92%)",
          }}
        />

        <div className="flex flex-col items-start gap-4">
          <div
            className="inline-flex h-12 w-12 items-center justify-center rounded-lg"
            style={{
              background: "var(--aw-danger-bg)",
              color: "var(--aw-danger)",
            }}
          >
            <ShieldAlert size={22} aria-hidden />
          </div>
          <div>
            <p className="aw-auth-form-eyebrow">{t("auth.accessDenied")}</p>
            <h1>{t("auth.unauthorized")}</h1>
            <p>{t("auth.unauthorizedMessage")}</p>
          </div>
        </div>

        <Link to="/login" className="aw-auth-submit aw-auth-simple-link">
          {t("auth.returnToLogin")}
        </Link>
      </section>
    </main>
  );
}
