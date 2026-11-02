export const CURRENT_APP_BUILD = '2026.11.02.5';
const APP_VERSION_STORAGE_KEY = 'tajer_app_build_version';

// Listen for dynamic import / chunk errors and auto-reload fresh code
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    window.location.reload();
  });
}

/**
 * Initializes automatic updates and guarantees that normal browsers
 * load directly, cleanly and instantly without ever showing "Can't open this page".
 */
export function initAppAutoUpdater(): void {
  if (typeof window === 'undefined') return;

  // 1. Check if application version changed and auto-migrate local storage
  runVersionMigration();

  // 2. Self-healing: Proactively unregister any legacy or broken service workers
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const reg of registrations) {
          reg.unregister().catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[AutoUpdater] SW cleanup notice:', err);
  }
}

/**
 * Auto-migrates caches between builds without logging the user out.
 */
function runVersionMigration(): void {
  try {
    const previousVersion = localStorage.getItem(APP_VERSION_STORAGE_KEY);
    if (previousVersion !== CURRENT_APP_BUILD) {
      console.log(`[AutoUpdater] Upgrading application from ${previousVersion || 'initial'} to ${CURRENT_APP_BUILD}`);

      // Clear any obsolete CacheStorage items that might block normal browsers
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name).catch(() => {});
          });
        }).catch(() => {});
      }

      // If any local products keys contain empty arrays '[]', remove them so fresh data is pulled
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.includes('products')) {
            const val = localStorage.getItem(k);
            if (val === '[]') {
              localStorage.removeItem(k);
            }
          }
        }
      } catch {}

      // Mark version as upgraded
      localStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_BUILD);
    }
  } catch (e) {
    console.warn('[AutoUpdater] Migration notice:', e);
  }
}

/**
 * User-triggered or admin-triggered one-tap clean update.
 * Clears old browser caches and performs fresh reload without losing user credentials.
 */
export async function forceFullCleanUpdate(): Promise<void> {
  try {
    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }

    // 2. Clear all CacheStorage items
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }

    // 3. Mark fresh build version
    localStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_BUILD);

    // 4. Force hard reload from server
    window.location.reload();
  } catch (err) {
    console.warn('Force update error:', err);
    window.location.reload();
  }
}
