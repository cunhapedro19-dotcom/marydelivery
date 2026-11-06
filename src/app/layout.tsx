import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Anton } from "next/font/google";
import "./globals.css";

/* Fonte de display do cardápio (títulos grandes, estilo do cardápio físico) */
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Delícias do Barão — Quentinhas", template: "%s" },
  description: "Quentinhas caseiras: monte seu pedido e envie pelo WhatsApp.",
  // App do cardápio no iPhone (Android usa o manifest); o painel tem o dele no admin/layout.tsx
  appleWebApp: { capable: true, title: "Delícias do Barão", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7a0c1b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={anton.variable}>
      <body className="bg-cream-100 font-sans text-brown-900 antialiased">{children}</body>
    </html>
  );
}