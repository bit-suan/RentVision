import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { routing, type Locale } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import I18nProvider from "@/components/i18n/I18nProvider";
import { AuthProvider } from "@/lib/AuthContext";
import "../globals.css";

export const instant = false;

export const metadata: Metadata = {
  title: "RentVision",
  description: "AI-powered rental discovery and trust platform",
};

export function generateStaticParams() {
  return routing.locales.map((locale: string) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = (await import(`../../../messages/${locale}.json`)).default;
  const fallbackMessages =
    locale !== "en"
      ? (await import(`../../../messages/en.json`)).default
      : undefined;

  return (
    <html lang={locale}>
      <body className="app-body" data-locale={locale}>
        <AuthProvider>
          <I18nProvider
            locale={locale}
            messages={messages}
            fallbackMessages={fallbackMessages}
          >
            <Header />
            <main className="site-main">{children}</main>
            <Footer />
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
