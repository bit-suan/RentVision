import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import SignUpClient from "./SignUpClient";

export const instant = false;

export function generateStaticParams() {
  return routing.locales.map((locale: string) => ({ locale }));
}

interface SignUpPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SignUpPage({ params }: SignUpPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SignUpClient />;
}
