// LoveAI: кэш приложения, чтобы оно открывалось быстро и без интернета. Версия 20261102160537.
const CACHE = 'loveai-20261102160537';
const FILES = ["./","app-info.js","app.js","apple-touch-icon.png","default-key.js","icon-192.png","icon-512.png","index.html","logo.png","manifest.webmanifest","mobile-backend.js","mobile-ui.js","skills/index.json","skills/web-design.md","style.css","whisper.js"];
// Files are cached one by one (cache.addAll rejects the whole install on any duplicate entry).
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(FILES.map(f => fetch(f, { cache: 'reload' }).then(r => r.ok && c.put(f, r)))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Only the app's own files come from the cache; requests to the AI always go to the network.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || /\/download\/|version\.json$/.test(url.pathname)) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
