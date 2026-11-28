// Dividir la cuenta (app independiente): guarda la app para usarla sin conexión. Solo código e iconos, nunca datos.
// Comparte archivos con MyFinZen (../split.js, ../ticket.js, ../styles.css, ../help.js): si cambian, sube VERSION aquí
// y en el sw.js de MyFinZen.
const VERSION='d1.0.0';
const CACHE = 'mfz-dividir-' + VERSION;
// El lector de tickets (~7 MB) va en la misma caché que usa MyFinZen: se descarga una sola vez para las dos apps
const OCR_CACHE = 'mfz-ocr-7.0.0';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  '../styles.css',
  '../help.js',
  '../ticket.js',
  '../split.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('mfz-dividir-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/vendor/ocr/')) {
    e.respondWith(caches.open(OCR_CACHE).then(c => c.match(req).then(r => r || fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  if (req.mode === 'navigate') { e.respondWith(caches.open(CACHE).then(c => c.match('./index.html')).then(r => r || fetch(req))); return; }
  e.respondWith(caches.open(CACHE).then(c => c.match(req)).then(r => r || fetch(req)));
});
