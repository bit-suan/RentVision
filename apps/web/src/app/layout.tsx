import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentVision",
  description:
    "Find rentals in Addis Ababa with map search, 360° tours, and lease Q&A.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <Link href="/" className="brand">
              <strong>RentVision</strong>
              <span>Addis Ababa rentals, mapped and inspectable</span>
            </Link>
            <Link className="button secondary" href="/">
              Map search
            </Link>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
