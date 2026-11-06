import type { MetadataRoute } from "next";

/**
 * App do CARDÁPIO — o que o cliente pode instalar no celular.
 *
 * O link deste arquivo entra sozinho nas páginas do site. O painel usa o manifest
 * dele (admin-manifest.webmanifest), que sobrepõe este nas rotas /admin.
 * O slug está fixo porque o site é de um estabelecimento só (Delícias do Barão).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Delícias do Barão",
    short_name: "Delícias do Barão",
    description: "Cardápio das Delícias do Barão: monte seu pedido e envie pelo WhatsApp.",
    start_url: "/delicias-do-barao",
    scope: "/delicias-do-barao",
    display: "standalone",
    orientation: "portrait",
    background_color: "#7a0c1b",
    theme_color: "#7a0c1b",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}