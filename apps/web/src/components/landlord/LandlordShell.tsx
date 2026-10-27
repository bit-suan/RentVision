"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/ui/Button";

const NAV_ITEMS = [
  { href: "/landlord", key: "dashboard", exact: true },
  { href: "/landlord/properties", key: "properties" },
  { href: "/landlord/inquiries", key: "inquiries" },
  { href: "/landlord/settings", key: "settings" },
] as const;

export default function LandlordShell({ children }: { children: ReactNode }) {
  const t = useTranslations("Landlord.Nav");
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLocalDev, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="landlord-shell">
      <aside className="landlord-sidebar">
        <div className="landlord-sidebar__brand">
          <span className="landlord-sidebar__eyebrow">{t("eyebrow")}</span>
          <strong>{t("title")}</strong>
        </div>

        <nav aria-label={t("aria")} className="landlord-nav">
          {NAV_ITEMS.map((item) => {
            const active =
              "exact" in item && item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`landlord-nav__link${active ? " is-active" : ""}`}
                href={item.href}
                key={item.href}
              >
                <span aria-hidden="true" className="landlord-nav__marker" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="landlord-sidebar__footer">
          {isLocalDev ? (
            <p className="landlord-dev-note">{t("localDevSession")}</p>
          ) : null}
          <p className="landlord-account">
            <span className="landlord-account__label">{t("signedInAs")}</span>
            <span className="landlord-account__name">
              {user?.username ?? user?.userId ?? t("account")}
            </span>
          </p>
          <div className="landlord-sidebar__actions">
            <Link className="landlord-text-link" href="/properties">
              {t("viewSite")}
            </Link>
            <Button onClick={handleSignOut} variant="quiet">
              {t("signOut")}
            </Button>
          </div>
        </div>
      </aside>

      <div className="landlord-workspace">{children}</div>
    </div>
  );
}
