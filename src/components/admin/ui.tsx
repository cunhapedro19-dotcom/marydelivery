"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/app/admin/actions";

/* ---------- Cabeçalho das telas ---------- */

export function AdminHeader({ title, back, subtitle }: { title: string; back?: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        {back && (
          <Link href={back} aria-label="Voltar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-admin-50 text-xl text-admin-800">
            ←
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold text-slate-900">{title}</h1>
          {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

/* ---------- Botões que executam uma ação (ativar, excluir, mover...) ---------- */

export function SubmitButton({ children, className, pendingText }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className ?? "btn-admin"}>
      {pending ? (pendingText ?? "Aguarde...") : children}
    </button>
  );
}

export function ActionForm({
  action,
  confirm,
  className,
  buttonClassName,
  children,
  hidden,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirm?: string;
  className?: string;
  buttonClassName?: string;
  children: ReactNode;
  hidden?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton className={buttonClassName}>{children}</SubmitButton>
    </form>
  );
}

/* ---------- Formulário com mensagem de retorno ---------- */

export function StatusForm({
  action,
  children,
  submitLabel,
  className,
  buttonClassName,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  submitLabel: string;
  className?: string;
  buttonClassName?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${
            state.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${buttonClassName ?? "btn-admin"} mt-4`}>
        {pending ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}

/* ---------- Campo de foto com envio ---------- */

async function shrinkImage(file: File, maxSize: number, quality: number): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", quality),
    );
  } catch {
    return file;
  }
}

export function ImageField({
  name,
  label,
  initialUrl,
  hint,
  heightClass = "h-44",
}: {
  name: string;
  label: string;
  initialUrl?: string | null;
  hint?: string;
  heightClass?: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await shrinkImage(file, 1200, 0.82);
      const body = new FormData();
      body.append("file", blob, "foto.jpg");
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) throw new Error("upload");
      const json = (await res.json()) as { url: string };
      setUrl(json.url);
    } catch {
      setError("Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={url} />
      {url ? (
        <img src={url} alt="" className={`${heightClass} w-full rounded-2xl border border-slate-200 object-cover`} />
      ) : (
        <div className={`${heightClass} grid w-full place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400`}>
          <span className="text-4xl">📷</span>
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <label className={`btn-admin-soft flex-1 cursor-pointer ${busy ? "opacity-60" : ""}`}>
          {busy ? "Enviando foto..." : url ? "📷 Trocar foto" : "📷 Adicionar foto"}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
        </label>
        {url && (
          <button type="button" onClick={() => setUrl("")} className="btn-danger-soft">
            Remover
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1.5 text-sm font-bold text-red-700">{error}</p>}
    </div>
  );
}

/* ---------- PWA: registro e aviso de instalação ---------- */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaSetup() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/admin" }).catch(() => {});
    }
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (standalone || localStorage.getItem("pwa-aviso-fechado") === "1") return;

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    setPlatform(ios ? "ios" : /android/i.test(ua) ? "android" : "other");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
  }
  function dismiss() {
    localStorage.setItem("pwa-aviso-fechado", "1");
    setVisible(false);
  }

  return (
    <div className="mb-4 rounded-2xl border border-admin-100 bg-admin-50 p-4 text-sm text-admin-800">
      <p className="font-bold">📲 Instale o app no seu celular para acessar o painel mais facilmente.</p>
      {installEvent ? (
        <button type="button" onClick={install} className="btn-admin mt-3 !min-h-12">
          Instalar agora
        </button>
      ) : platform === "ios" ? (
        <p className="mt-2">
          No Safari, toque em <strong>Compartilhar</strong> (quadrado com seta) e depois em{" "}
          <strong>Adicionar à Tela de Início</strong>.
        </p>
      ) : (
        <p className="mt-2">
          No menu do navegador (⋮), toque em <strong>Instalar aplicativo</strong> ou{" "}
          <strong>Adicionar à tela inicial</strong>.
        </p>
      )}
      <button type="button" onClick={dismiss} className="mt-2 text-xs font-bold text-admin-700 underline">
        Não mostrar novamente
      </button>
    </div>
  );
}
