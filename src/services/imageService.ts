import { get as idbGet, set as idbSet } from 'idb-keyval';
import { getSupabase } from './supabase';

/**
 * On-Demand Product Image Service
 * Solves mobile memory spikes and Safari crash issues across all user accounts.
 * Decouples heavy image data from the lightweight product catalog.
 * Images are fetched and cached strictly on-demand (only for products currently on screen).
 */
class ProductImageService {
  private memoryCache: Map<string, string> = new Map();
  private pendingRequests: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();
  private failedIds: Set<string> = new Set();

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify(): void {
    this.listeners.forEach(cb => {
      try { cb(); } catch {}
    });
  }

  /**
   * Synchronously get image from memory if available, or return fallback
   */
  public getImage(productId?: string, fallbackUrl?: string): string {
    if (!productId) return fallbackUrl || '';
    if (this.memoryCache.has(productId)) {
      return this.memoryCache.get(productId)!;
    }
    if (fallbackUrl) {
      this.memoryCache.set(productId, fallbackUrl);
      return fallbackUrl;
    }
    return '';
  }

  /**
   * Set image in memory and persist in IndexedDB
   */
  public setImage(productId: string, imageUrl: string): void {
    if (!productId) return;
    this.memoryCache.set(productId, imageUrl);
    if (typeof window !== 'undefined') {
      try {
        idbSet(`tajer_img_${productId}`, imageUrl).catch(() => {});
      } catch {}
    }
    this.notify();
  }

  /**
   * Load images on-demand for a specific batch of products (e.g. current page of 8-10 items)
   */
  public async loadImagesForProducts(products: { id: string; image_url?: string }[]): Promise<void> {
    if (!products || products.length === 0 || typeof window === 'undefined') return;

    const idsToFetchFromCloud: string[] = [];

    // 1. Check memory and IndexedDB first
    for (const p of products) {
      if (!p.id) continue;
      
      // If already has direct URL (e.g. freshly uploaded or in memory)
      if (this.memoryCache.has(p.id)) continue;

      if (p.image_url) {
        this.memoryCache.set(p.id, p.image_url);
        continue;
      }

      if (this.failedIds.has(p.id) || this.pendingRequests.has(p.id)) continue;

      // Check IndexedDB
      try {
        const cached = await idbGet<string>(`tajer_img_${p.id}`);
        if (cached) {
          this.memoryCache.set(p.id, cached);
          continue;
        }
      } catch {}

      // If not in local cache, schedule cloud fetch
      idsToFetchFromCloud.push(p.id);
      this.pendingRequests.add(p.id);
    }

    if (this.memoryCache.size > 0) {
      this.notify();
    }

    if (idsToFetchFromCloud.length === 0) return;

    // 2. Fetch missing images from Supabase in small, non-blocking batch
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error } = await supabase
        .from('products')
        .select('id, image_url')
        .in('id', idsToFetchFromCloud);

      if (!error && data) {
        let hasNew = false;
        for (const item of data) {
          this.pendingRequests.delete(item.id);
          if (item.image_url) {
            this.memoryCache.set(item.id, item.image_url);
            hasNew = true;
            try {
              idbSet(`tajer_img_${item.id}`, item.image_url).catch(() => {});
            } catch {}
          } else {
            this.failedIds.add(item.id);
          }
        }

        if (hasNew) {
          this.notify();
        }
      } else {
        idsToFetchFromCloud.forEach(id => this.pendingRequests.delete(id));
      }
    } catch {
      idsToFetchFromCloud.forEach(id => this.pendingRequests.delete(id));
    }
  }
}

export const imageService = new ProductImageService();
