import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Anton } from "next/font/google";
import "./globals.css";

/* Fonte de display do cardápio (títulos grandes, estilo do cardápio físico) */
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Mary Delivery — Lanches", template: "%s" },
  description: "Delivery de lanches: monte seu pedido e envie pelo WhatsApp.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a10",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={anton.variable}>
      <body className="bg-night-950 font-sans text-white antialiased">{children}</body>
    </html>
  );
}
