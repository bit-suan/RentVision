import type { Metadata } from "next";
import Link from "next/link";
import { AuthProvider } from "@/lib/AuthContext";
import UserMenu from "@/components/layout/UserMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentVision",
  description:
    "Find rentals in Addis Ababa with map search, 360° tours, and lease Q&A.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="app-shell">
            <header className="topbar">
              <Link href="/" className="brand">
                <strong>RentVision</strong>
                <span>Addis Ababa rentals, mapped and inspectable</span>
              </Link>
              <div className="header-actions">
                <Link className="button secondary" href="/">
                  Map search
                </Link>
                <UserMenu />
              </div>
            </header>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
