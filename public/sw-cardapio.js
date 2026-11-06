// Service Worker do cardápio público (Delícias do Barão)
// Estratégia: rede-primeiro para navegação, cache-primeiro para assets estáticos e imagens

const CACHE_NAME = "cardapio-v1";
const OFFLINE_URL = "/offline.html";

// Assets que devem ser cacheados imediatamente
const STATIC_ASSETS = [
  "/",
  "/manifest.ts",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

// Instalação: pré-cache dos assets estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS.map((url) => new Request(url, { cache: "reload" })));
    })
  );
  self.skipWaiting();
});

// Ativação: limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Interceptação de requisições
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Só processa requisições do mesmo origin
  if (url.origin !== location.origin) return;

  // Navegação (páginas): rede-primeiro com fallback para cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clona e guarda no cache se deu certo
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline: tenta servir do cache
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Se não tem no cache, mostra página offline
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Assets estáticos (_next/static, imagens da API): cache-primeiro
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/api/imagens/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Demais: rede-primeiro (APIs, etc)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Página offline simples
const OFFLINE_HTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delícias do Barão - Offline</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #2b170b; color: #fdf6e3; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; text-align: center; }
    .container { max-width: 320px; }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    p { margin-bottom: 1.5rem; color: #f7dfa3; }
    button { background: #e5a823; color: #2b170b; border: none; padding: 12px 24px; font-size: 1rem; font-weight: bold; border-radius: 12px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🍲 Delícias do Barão</h1>
    <p>Você está offline. Verifique sua conexão e tente novamente.</p>
    <button onclick="window.location.reload()">Tentar novamente</button>
  </div>
</body>
</html>
`;

// Responde à requisição da página offline
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate" && event.request.url.includes("/offline.html")) {
    event.respondWith(new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html" } }));
  }
});