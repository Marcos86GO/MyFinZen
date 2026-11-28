// «Dividir la cuenta» (/dividir/) ahora es WhoseBill? (/whosebill/). Este service worker sustituye al de la app antigua en los
// dispositivos que la tenían instalada: borra su caché, se da de baja y lleva las ventanas abiertas a WhoseBill?.
// (Los usuarios y tickets se conservan: están en la base del navegador, no en la caché.)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('mfz-dividir-')) await caches.delete(k);
    await self.clients.claim();
    const to = new URL('../whosebill/', self.registration.scope).href;
    for (const c of await self.clients.matchAll({ type: 'window' })) { try { await c.navigate(to); } catch (err) {} }
    await self.registration.unregister();
  })());
});
// Mientras tanto, cualquier página de /dividir/ va a WhoseBill?
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') e.respondWith(Response.redirect(new URL('../whosebill/', self.registration.scope).href, 302));
});
