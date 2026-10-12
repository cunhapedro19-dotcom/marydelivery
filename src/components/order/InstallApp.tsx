"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Faixa de instalação do app do cardápio (igual ao Ovo Frito):
 * fica no TOPO da página e só aparece quando o próprio navegador oferece
 * a instalação (beforeinstallprompt) — aí o botão funciona de verdade.
 * No iPhone o navegador não oferece: a faixa nem aparece (o cliente instala
 * pelo menu Compartilhar quando quiser — sem instruções na tela, pra não confundir).
 */
export function InstallApp({ slug }: { slug: string }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-cardapio.js", { scope: `/${slug}` }).catch(() => {});
    }
    const nav = navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    if (standalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [slug]);

  if (!visible || !installEvent) return null;

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
  }

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 bg-neon-pink px-4 py-2.5 text-white shadow-lg">
      <span className="min-w-0 flex-1 text-sm font-extrabold leading-tight">📲 Instale o app da Mary!</span>
      <button
        type="button"
        onClick={install}
        className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-neon-pink active:scale-95"
      >
        Instalar
      </button>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Fechar aviso de instalação"
        className="shrink-0 px-1 text-lg text-white/80"
      >
        ✕
      </button>
    </div>
  );
}
