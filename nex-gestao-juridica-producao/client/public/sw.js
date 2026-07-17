const CACHE_NAME = 'nex-gestao-juridica-v43-shell';
const APP_SHELL = ['/', '/manifest.webmanifest', '/nexlabs-logo.jpeg', '/pwa-icon-192.png', '/pwa-icon-512.png'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match('/'))));
});
