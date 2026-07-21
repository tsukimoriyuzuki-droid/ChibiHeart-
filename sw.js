const CACHE_NAME = 'chibiheart-v1';

// Arquivos para guardar em cache estático
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './animes_recomendados.json',
  './hero_banner.json',
  './info.json',
  './js/main.js',
  './js/animes_recomendados.js',
  './js/hero_banner.js',
  './js/info.js',
  './js/player.js',
  './js/trakt.js',
  './manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Guardando ficheiros na cache...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] A apagar cache antiga:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceção de requisições (Estratégia: Network First com Fallback para Cache)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a rede responder, atualiza a cache com a resposta mais recente
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Se estiver offline ou falhar, carrega a partir da cache
        return caches.match(event.request);
      })
  );
});
