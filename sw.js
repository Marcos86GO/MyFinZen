// MyFinZen service worker: guarda la app para usarla sin conexión.
// Solo cachea los archivos de la app (código e iconos), nunca tus datos.
// Sube VERSION en cada cambio para que los dispositivos reciban la actualización.
const VERSION='v1.16.0';
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

// Compartir desde otra app (Android: Compartir → MyFinZen). Los archivos se quedan SOLO en la memoria
// del service worker hasta que la página los recoge (o 3 minutos); nunca se escriben en disco ni en caché.
const SHARED = new Map();
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data && e.data.type === 'getShared' && e.ports && e.ports[0]) {
    const s = SHARED.get(String(e.data.id || ''));
    SHARED.delete(String(e.data.id || ''));
    e.ports[0].postMessage({ type: 'shared', files: s ? s.files : [] });
    if (s) s.done();
  }
});
function shareTarget(e) {
  let done; const kept = new Promise(r => { done = r; setTimeout(r, 180000); });
  e.waitUntil(kept); // mantiene vivo el service worker hasta que la página recoja los archivos
  e.respondWith((async () => {
    let id = '';
    try {
      const fd = await e.request.formData();
      const files = fd.getAll('files').filter(f => f && typeof f === 'object' && typeof f.size === 'number' && f.size > 0 && f.size <= 30e6).slice(0, 20);
      if (files.length) { id = crypto.randomUUID(); SHARED.set(id, { files, done: () => { SHARED.delete(id); done(); } }); setTimeout(() => SHARED.delete(id), 180000); }
      else done();
    } catch (err) { done(); }
    return Response.redirect(new URL('./?share=' + id + '#importar', self.registration.scope).href, 303);
  })());
}

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method === 'POST' && url.origin === self.location.origin && url.pathname.endsWith('/share-target')) { shareTarget(e); return; }
  // Solo archivos propios; las llamadas a la API de Claude pasan directas y nunca se cachean.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Página: primero la versión guardada (rápida y sin conexión); el aviso de actualización lo gestiona la app.
    e.respondWith(caches.match('./index.html').then(r => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
