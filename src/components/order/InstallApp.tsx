"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Faixa de instalação do app do cardápio: registra o service worker do cliente
 * e oferece o botão de instalar (com instruções para o iPhone, que não tem botão).
 */
export function InstallApp({ slug }: { slug: string }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-cardapio.js", { scope: `/${slug}` }).catch(() => {});
    }
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (standalone || localStorage.getItem("pwa-cardapio-fechado") === "1") return;

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
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, [slug]);

  if (!visible) return null;

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
  }
  function dismiss() {
    localStorage.setItem("pwa-cardapio-fechado", "1");
    setVisible(false);
  }

  return (
    <div className="rounded-3xl border border-neon-cyan/25 bg-night-900 p-4">
      <p className="font-extrabold">📲 Instale o app da Mary no seu celular!</p>
      {installEvent ? (
        <button type="button" onClick={install} className="btn-neon mt-3 w-full">
          Instalar agora
        </button>
      ) : platform === "ios" ? (
        <p className="mt-2 text-sm text-white/80">
          No Safari, toque em <strong>Compartilhar</strong> (o quadrado com seta) e depois em{" "}
          <strong>Adicionar à Tela de Início</strong>.
        </p>
      ) : (
        <p className="mt-2 text-sm text-white/80">
          No menu do navegador (⋮), toque em <strong>Instalar aplicativo</strong> ou{" "}
          <strong>Adicionar à tela inicial</strong>.
        </p>
      )}
      <button type="button" onClick={dismiss} className="mt-2 text-xs font-bold text-white/50 underline">
        Não mostrar novamente
      </button>
    </div>
  );
}
