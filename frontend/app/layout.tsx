import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ezra VaBitaron — Affordable Housing Lottery",
  description: "Tel Aviv-Yafo Municipality Affordable Housing Lottery System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
