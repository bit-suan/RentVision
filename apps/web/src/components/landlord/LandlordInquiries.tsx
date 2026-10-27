"use client";

import { useTranslations } from "next-intl";

export default function LandlordInquiries() {
  const t = useTranslations("Landlord.Inquiries");

  return (
    <div className="landlord-page">
      <header className="landlord-page-header">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <p className="muted">{t("description")}</p>
        </div>
      </header>

      <section className="landlord-card">
        <h2>{t("unavailableTitle")}</h2>
        <p>{t("unavailableMessage")}</p>
        <p className="muted">{t("whatYouCanDo")}</p>
      </section>

      <aside className="landlord-note">
        <strong>{t("noteTitle")}</strong>
        <p>{t("note")}</p>
      </aside>
    </div>
  );
}
