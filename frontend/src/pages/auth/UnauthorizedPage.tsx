import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function UnauthorizedPage() {
  const { t } = useTranslation();

  return (
    <main className="aw-auth-page aw-auth-simple-page">
      <section className="aw-auth-simple-card">
        <p className="aw-auth-form-eyebrow">{t("auth.accessDenied")}</p>
        <h1>{t("auth.unauthorized")}</h1>
        <p>{t("auth.unauthorizedMessage")}</p>
        <Link to="/login" className="aw-auth-submit aw-auth-simple-link">
          {t("auth.returnToLogin")}
        </Link>
      </section>
    </main>
  );
}
