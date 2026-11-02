// Self-healing & Self-destroying Service Worker for Tajer AI Studio
// Instantly clears any stuck caches and unregisters itself safely across all client browsers

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // 1. Clear any corrupted or obsolete caches
        if ('caches' in self) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch (e) {
        console.warn('Cache purge notice:', e);
      }

      try {
        // 2. Unregister this service worker registration
        await self.registration.unregister();
      } catch (e) {
        console.warn('Unregister notice:', e);
      }

      try {
        // 3. Claim all window clients so they are freed from the worker
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url);
          }
        }
      } catch (e) {
        console.warn('Client release notice:', e);
      }
    })()
  );
});

// Pass-through fetch handler that NEVER blocks or fails navigation requests
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then(cached => cached || fetch(event.request));
    })
  );
});
