// MyFinZen service worker: guarda la app para usarla sin conexión.
// Solo cachea los archivos de la app (código e iconos), nunca tus datos.
// Sube VERSION en cada cambio para que los dispositivos reciban la actualización.
const VERSION='v1.8.0';
const CACHE = 'myfinzen-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './help.js',
  './app.js',
  './vendor/pdf.min.js',
  './vendor/pdf.worker.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('myfinzen-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Solo archivos propios; las llamadas a la API de Claude pasan directas y nunca se cachean.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Página: primero la versión guardada (rápida y sin conexión); el aviso de actualización lo gestiona la app.
    e.respondWith(caches.match('./index.html').then(r => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
