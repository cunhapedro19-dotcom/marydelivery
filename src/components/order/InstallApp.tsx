"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Quando a pessoa fecha a faixa, ela fica escondida por 3 dias (pra não enjoadar)
const FECHAR_KEY = "mary-instalar-fechado";

/**
 * Faixa de instalação do app do cardápio — SIMPLES pra qualquer pessoa:
 * - Aparece sempre no topo, sem depender do navegador oferecer.
 * - Se o navegador oferece a instalação (beforeinstallprompt), o botão
 *   "Instalar" abre a janelinha oficial do Chrome: 1 toque e pronto.
 * - Se não oferece (Chrome atual na 1ª visita, iPhone...), o botão abre
 *   uma telinha com o passo a passo de 3 toques, diferente por aparelho.
 */
export function InstallApp({ slug }: { slug: string }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Registra o service worker (parte do que torna o site instalável)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-cardapio.js", { scope: `/${slug}` }).catch(() => {});
    }

    const nav = navigator as Navigator & { standalone?: boolean };
    const jaInstalado =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);

    // Já está usando o app instalado? Não mostra faixa.
    if (jaInstalado) return;

    // Fechou a faixa recentemente? Não enche a paciência.
    try {
      const fechado = localStorage.getItem(FECHAR_KEY);
      if (fechado && Date.now() - Number(fechado) < 3 * 24 * 60 * 60 * 1000) return;
    } catch {
      // sem localStorage, mostra mesmo assim
    }

    // A faixa aparece na hora, sem esperar o navegador
    setVisible(true);

    // Se o navegador oferecer a instalação, guardamos o atalho pro botão 1-toque
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setVisible(false);
      try {
        localStorage.removeItem(FECHAR_KEY);
      } catch {}
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [slug]);

  async function instalar() {
    if (installEvent) {
      // Caminho rápido: a janelinha oficial do navegador
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") setVisible(false);
      return;
    }
    // Caminho ensinado: passo a passo de 3 toques
    setInstructions(true);
  }

  function fechar() {
    setVisible(false);
    try {
      localStorage.setItem(FECHAR_KEY, String(Date.now()));
    } catch {}
  }

  if (!visible) return null;

  return (
    <>
      {/* Faixa rosa fixa no topo, acima de tudo */}
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-neon-pink px-4 py-2.5 text-white shadow-lg">
        <span className="min-w-0 flex-1 text-sm font-extrabold leading-tight">
          📲 Instale o app da Mary!
        </span>
        <button
          type="button"
          onClick={instalar}
          className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-neon-pink active:scale-95"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar aviso de instalação"
          className="shrink-0 px-1 text-lg text-white/80"
        >
          ✕
        </button>
      </div>

      {/* Passo a passo simples, pra quem nunca instalou nada */}
      {instructions && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-6"
          onClick={() => setInstructions(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-night-900 p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xl font-extrabold">📲 Instalar em 3 toques</p>
            {isIos ? (
              <ol className="mt-3 space-y-2 text-[15px] text-white/85">
                <li>1. Toque no ícone Compartilhar (o quadrado com seta)</li>
                <li>2. Toque em "Adicionar à Tela de Início"</li>
                <li>3. Toque em "Adicionar". Pronto!</li>
              </ol>
            ) : (
              <ol className="mt-3 space-y-2 text-[15px] text-white/85">
                <li>1. Toque no menu ⋮ (no canto superior direito)</li>
                <li>2. Toque em "Instalar aplicativo" ou "Adicionar à tela inicial"</li>
                <li>3. Toque em "Instalar". Pronto!</li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setInstructions(false)}
              className="btn-neon mt-5 w-full"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
