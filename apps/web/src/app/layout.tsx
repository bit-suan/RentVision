import type { Metadata } from "next";
import { AuthProvider } from "@/lib/AuthContext";

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
      <body suppressHydrationWarning><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
