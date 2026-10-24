import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentVision",
  description: "AI-powered rental discovery and trust platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="app-body">
        <Header />

        <main className="site-main">{children}</main>

        <Footer />
      </body>
    </html>
  );
}
