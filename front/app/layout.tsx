import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Noyer — Lampes semi-artisanales, Genève",
  description:
    "Lampes semi-artisanales fabriquées à Genève : gammes Classic et Premium.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
