// MyFinZen service worker: guarda la app para usarla sin conexión.
// Solo cachea los archivos de la app (código e iconos), nunca tus datos.
// Sube VERSION en cada cambio para que los dispositivos reciban la actualización.
const VERSION='v1.24.0';
const CACHE = 'myfinzen-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './help.js',
  './app.js',
  './cal.js',
  './sync.js',
  './vendor/pdf.min.js',
  './vendor/pdf.worker.min.js',
  './vendor/qrcode.js',
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

/* Aviso de pagos importantes con la app cerrada (Calendario). El service worker no tiene la clave de la bóveda:
   solo lee el registro 'calsched' que la app deja en IndexedDB cuando activas las notificaciones, con las FECHAS de
   los avisos y CUÁNTOS pagos son (sin nombres ni importes). El navegador lo despierta con la sincronización periódica. */
const calDB = () => new Promise((res, rej) => { const r = indexedDB.open('misfinanzas', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv'); // la misma estructura que crea la app
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const calTx = (db, mode, fn) => new Promise((res, rej) => { const t = db.transaction('kv', mode), q = fn(t.objectStore('kv')); t.oncomplete = () => res(q.result); t.onerror = t.onabort = () => rej(t.error); });
const isoDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
async function calCheck() {
  if (!self.Notification || Notification.permission !== 'granted') return;
  const db = await calDB();
  try {
    const rec = await calTx(db, 'readonly', s => s.get('calsched'));
    if (!rec || typeof rec !== 'object' || !Array.isArray(rec.days)) return;
    const d = new Date(), now = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const shown = (Array.isArray(rec.shown) ? rec.shown : []).filter(isoDay);
    const due = rec.days.filter(x => x && isoDay(x.d) && isoDay(x.u) && x.d <= now && x.u >= now && !shown.includes(x.d)).slice(0, 3);
    if (!due.length) return;
    const en = rec.lang === 'en';
    for (const x of due) {
      const n = Math.max(1, Math.min(99, Math.round(Number(x.n)) || 1));
      await self.registration.showNotification(en ? 'MyFinZen · Significant payments' : 'MyFinZen · Pagos importantes', {
        body: en ? `You have ${n === 1 ? '1 significant payment' : n + ' significant payments'} before your next paycheck. Tap to see them.`
                 : `Tienes ${n === 1 ? '1 pago importante' : n + ' pagos importantes'} antes de tu próxima nómina. Toca para verlos.`,
        tag: 'mfz-pay-' + x.d, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { hash: '#calendario' } });
      shown.push(x.d);
    }
    rec.shown = shown.slice(-60);
    await calTx(db, 'readwrite', s => s.put(rec, 'calsched'));
  } finally { db.close(); }
}
self.addEventListener('periodicsync', e => { if (e.tag === 'mfz-cal') e.waitUntil(calCheck().catch(() => {})); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL('./#calendario', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({ type: 'goto', hash: '#calendario' }); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});

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
