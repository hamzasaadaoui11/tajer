import { registerSW } from 'virtual:pwa-register';

export const CURRENT_APP_BUILD = '2026.11.02.2';
const APP_VERSION_STORAGE_KEY = 'tajer_app_build_version';

/**
 * Initializes automatic PWA updates and cache migrations.
 * Guarantees that users never have to clear cookies, reinstall the app,
 * or open private browser windows after any update.
 */
export function initAppAutoUpdater(): void {
  if (typeof window === 'undefined') return;

  // 1. Check if application version changed and auto-migrate local storage
  runVersionMigration();

  // 2. Register Service Worker with instant auto-update and client claiming
  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[AutoUpdater] New version detected! Checking reload guard...');
        try {
          const lastReload = sessionStorage.getItem('tajer_sw_reload_ts');
          const now = Date.now();
          if (!lastReload || now - parseInt(lastReload, 10) > 60000) {
            sessionStorage.setItem('tajer_sw_reload_ts', String(now));
            updateSW(true);
          }
        } catch {}
      },
      onOfflineReady() {
        console.log('[AutoUpdater] PWA offline cache ready');
      },
      onRegisteredSW(swUrl, registration) {
        console.log('[AutoUpdater] Service Worker registered at:', swUrl);
        if (registration) {
          // Check for updates periodically (every 10 minutes)
          setInterval(() => {
            registration.update().catch(() => {});
          }, 10 * 60 * 1000);

          // Check for updates when user switches back to the tab/app
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              registration.update().catch(() => {});
            }
          });
        }
      },
      onRegisterError(error) {
        console.warn('[AutoUpdater] SW registration warning:', error);
      },
    });
  } catch (err) {
    console.warn('[AutoUpdater] PWA auto-updater initialization notice:', err);
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
