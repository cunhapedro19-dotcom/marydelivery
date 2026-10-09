import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Mary Delivery — Painel", template: "%s · Painel" },
  description: "Painel para administrar o cardápio do Mary Delivery.",
  manifest: "/admin-manifest.webmanifest",
  appleWebApp: { capable: true, title: "Mary Delivery", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f6f8b",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-admin-50 text-slate-900">
      <div className="mx-auto w-full max-w-md px-4 pb-10">{children}</div>
    </div>
  );
}
