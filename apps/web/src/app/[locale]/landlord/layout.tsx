import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import LandlordShell from "@/components/landlord/LandlordShell";

export const instant = false;

interface LandlordLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LandlordLayout({
  children,
  params,
}: LandlordLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <ProtectedRoute>
      <LandlordShell>{children}</LandlordShell>
    </ProtectedRoute>
  );
}
