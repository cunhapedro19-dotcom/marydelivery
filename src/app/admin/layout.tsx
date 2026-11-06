import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Anton } from "next/font/google";
import "../globals.css";

/* Fonte de display (mesma do cardápio, para consistência) */
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Painel Delícias do Barão", template: "%s | Painel" },
  description: "Painel administrativo do cardápio Delícias do Barão.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f6f8b",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={anton.variable}>
      <body className="bg-admin-50 font-sans text-slate-900 antialiased">{children}</body>
    </html>
  );
}