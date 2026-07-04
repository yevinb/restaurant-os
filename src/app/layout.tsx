import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "RestaurantOS — Cloud Operating System for Restaurants",
  description:
    "Reservations, CRM, loyalty, marketing, analytics, and staff scheduling in one platform.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "RestaurantOS" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
