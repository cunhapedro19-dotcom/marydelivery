import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Mary Delivery — Lanches", template: "%s" },
  description: "Delivery de lanches: monte seu pedido e envie pelo WhatsApp.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffaf3",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-cream-50 font-sans text-cocoa-900 antialiased">{children}</body>
    </html>
  );
}
