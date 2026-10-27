"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/AuthContext";

export default function LandlordSettings() {
  const t = useTranslations("Landlord.Settings");
  const { user, isLocalDev } = useAuth();

  return (
    <div className="landlord-page">
      <header className="landlord-page-header">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className="muted">{t("description")}</p>
        </div>
      </header>

      <section aria-labelledby="landlord-account-heading" className="landlord-card">
        <h2 id="landlord-account-heading">{t("accountTitle")}</h2>
        <dl className="landlord-detail-list">
          <div>
            <dt>{t("username")}</dt>
            <dd>{user?.username ?? user?.userId ?? t("notAvailable")}</dd>
          </div>
          <div>
            <dt>{t("userId")}</dt>
            <dd className="landlord-mono">
              {user?.userId ?? t("notAvailable")}
            </dd>
          </div>
          <div>
            <dt>{t("authMode")}</dt>
            <dd>{isLocalDev ? t("authLocal") : t("authCognito")}</dd>
          </div>
        </dl>
        {isLocalDev ? <p className="muted">{t("localDevNote")}</p> : null}
      </section>

      <section className="landlord-card">
        <h2>{t("unavailableTitle")}</h2>
        <p>{t("unavailableMessage")}</p>
      </section>

      <aside className="landlord-note">
        <strong>{t("securityTitle")}</strong>
        <p>{t("securityNote")}</p>
      </aside>
    </div>
  );
}
