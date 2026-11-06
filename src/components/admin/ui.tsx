"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";

/* ---------- Layout do painel ---------- */

export function AdminLayout({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="min-h-screen bg-admin-50 font-sans text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-3 text-slate-900 hover:opacity-80">
            <span className="text-2xl">🍲</span>
            <span className="font-display text-xl font-bold tracking-wide">Painel Delícias do Barão</span>
          </Link>
          <h1 className="text-lg font-bold text-slate-700">{title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}

/* ---------- Componentes de formulário ---------- */

export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`admin-card ${className}`}>{children}</div>;
}

export function AdminLinkCard({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return <Link href={href} className={`admin-link-card ${className}`}>{children}</Link>;
}

export function Label({ children, className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { className?: string }) {
  return <label className={`label ${className}`} {...props}>{children}</label>;
}

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return <input className={`input ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) {
  return <textarea className={`input ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return <select className={`input ${className}`} {...props} />;
}

export function Checkbox({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" className="h-5 w-5 rounded border-2 border-slate-300 text-admin-600 focus:ring-2 focus:ring-admin-600" {...props} />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  );
}

/* ---------- Botões ---------- */

export function SubmitButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return <button type="submit" className={`btn-admin ${className}`} {...props}>{children}</button>;
}

export function ActionForm({ action, children, method = "POST", className = "" }: { action: string; children: ReactNode; method?: string; className?: string }) {
  return <form action={action} method={method} className={className}>{children}</form>;
}

export function StatusForm({ action, children, method = "POST", className = "" }: { action: string; children: ReactNode; method?: string; className?: string }) {
  return <form action={action} method={method} className={className}>{children}</form>;
}

/* ---------- Upload de imagem ---------- */

export function ImageField({
  value,
  onChange,
  label = "Imagem",
  help = "JPG/PNG até 2MB. Serve como foto do produto no cardápio.",
  accept = "image/*",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  help?: string;
  accept?: string;
}) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Arquivo muito grande (máx. 2MB).");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Falha no upload");
      const { id } = await res.json();
      const url = `/api/imagens/${id}`;
      setPreview(url);
      onChange(url);
    } catch (err) {
      alert("Erro ao enviar imagem: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    setPreview(null);
    onChange("");
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {preview && (
        <div className="relative w-40 h-40 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          {!uploading && (
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-1 right-1 rounded-full bg-red-500/90 px-2 py-1 text-xs font-bold text-white shadow"
            >
              ✕
            </button>
          )}
        </div>
      )}
      <input type="file" accept={accept} onChange={handleChange} disabled={uploading} className="sr-only" id={label.toLowerCase().replace(/\s+/g, "-")} />
      <label htmlFor={label.toLowerCase().replace(/\s+/g, "-")} className="btn-admin-soft cursor-pointer">
        {uploading ? "Enviando..." : preview ? "Trocar imagem" : "Escolher imagem"}
      </label>
      <p className="text-xs text-slate-500">{help}</p>
    </div>
  );
}

/* ---------- Botão de instalar PWA (painel) ---------- */

export function PwaSetup() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [installEvent, setInstallEvent] = useState<Event & { prompt: () => Promise<void> } | null>(null);
  const [isIos] = useState(() => /iphone|ipad|ipod/i.test(navigator.userAgent));

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/admin" }).catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as Event & { prompt: () => Promise<void> });
    };
    const onInstalled = () => setShowInstructions(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") setShowInstructions(false);
      return;
    }
    setShowInstructions(true);
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-admin-600 bg-white p-4">
      <p className="text-sm font-bold text-admin-700">📲 Instalar painel no celular</p>
      <p className="mt-1 text-xs text-slate-500">Funciona como app: acesso rápido, offline básico, notificações futuras.</p>
      <button type="button" onClick={handleInstall} className="btn-admin-outline mt-3 w-full">
        📲 Instalar no celular
      </button>
      {showInstructions && (
        <div className="mt-4 fixed inset-0 z-50 grid place-items-center bg-black/50 px-4" onClick={() => setShowInstructions(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold text-admin-800">Como instalar</p>
            {isIos ? (
              <ol className="mt-3 space-y-2 text-sm text-slate-700">
                <li>1. Toque no ícone Compartilhar (quadrado com seta)</li>
                <li>2. Role e toque em "Adicionar à Tela de Início"</li>
                <li>3. Toque em "Adicionar"</li>
              </ol>
            ) : (
              <ol className="mt-3 space-y-2 text-sm text-slate-700">
                <li>1. Toque no menu ⋮ (canto superior direito)</li>
                <li>2. Toque em "Instalar aplicativo" ou "Adicionar à tela inicial"</li>
                <li>3. Toque em "Instalar"</li>
              </ol>
            )}
            <button type="button" onClick={() => setShowInstructions(false)} className="btn-admin mt-4 w-full">
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Tabelas ---------- */

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-x-auto rounded-2xl border border-slate-200 ${className}`}><table className="w-full text-sm">{children}</table></div>;
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50 border-b border-slate-200">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function TableRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tr className={`${className} hover:bg-slate-50`}>{children}</tr>;
}

export function TableCell({ children, className = "", header = false, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { className?: string; header?: boolean }) {
  const Tag = header ? "th" : "td";
  return <Tag className={`px-4 py-3 ${header ? "font-bold text-slate-700" : "text-slate-600"} ${className}`} {...props}>{children}</Tag>;
}

/* ---------- Badges ---------- */

export function Badge({ children, variant = "default", className = "" }: { children: ReactNode; variant?: "default" | "success" | "warning" | "danger"; className?: string }) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${variants[variant]} ${className}`}>{children}</span>;
}