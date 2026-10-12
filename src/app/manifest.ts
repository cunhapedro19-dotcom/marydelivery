import type { MetadataRoute } from "next";

/**
 * App do CARDÁPIO — o que o cliente pode instalar no celular.
 *
 * O link deste arquivo entra sozinho nas páginas do site. O painel usa o manifest
 * dele (admin-manifest.webmanifest), que sobrepõe este nas rotas /admin.
 * O slug está fixo porque o site é de um estabelecimento só (Mary Delivery).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/mary-delivery",
    name: "Mary Delivery",
    short_name: "Mary Delivery",
    description: "Cardápio da Mary Delivery: monte seu pedido e envie pelo WhatsApp.",
    start_url: "/mary-delivery",
    scope: "/mary-delivery",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a10",
    theme_color: "#0a0a10",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
