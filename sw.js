// The web app used to live at the site root with its offline cache here. It moved to /app/,
// so this worker only removes itself and reloads the open pages, which then show the download page.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  self.registration.unregister()
    .then(() => self.clients.matchAll({ type: 'window' }))
    .then(clients => clients.forEach(c => c.navigate(c.url)))
));
