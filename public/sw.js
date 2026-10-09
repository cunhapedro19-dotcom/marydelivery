/* Service worker do painel administrativo.
 * Mantém o app instalável e mostra uma tela amigável quando não há internet. */
const CACHE = "painel-cardapio-v1";
const PRECACHE = ["/icons/icon-192.png", "/icons/icon-512.png", "/admin-manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const OFFLINE_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão</title>
<style>body{font-family:system-ui,sans-serif;background:#f2f6f8;color:#113f52;display:grid;place-items:center;min-height:100dvh;margin:0;text-align:center;padding:24px}
h1{font-size:1.4rem}button{margin-top:16px;min-height:52px;padding:0 24px;border:0;border-radius:16px;background:#1f6f8b;color:#fff;font-weight:700;font-size:1rem}</style></head>
<body><div><div style="font-size:48px">📡</div><h1>Sem conexão com a internet</h1>
<p>Conecte-se para continuar administrando o cardápio.</p>
<button onclick="location.reload()">Tentar de novo</button></div></body></html>`;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Páginas: sempre tenta a rede; se falhar, usa a última versão em cache ou a tela offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && url.pathname.startsWith("/admin")) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }),
    );
    return;
  }

  // Arquivos estáticos, ícones e fotos: cache primeiro, rede depois
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/api/imagens/");
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
