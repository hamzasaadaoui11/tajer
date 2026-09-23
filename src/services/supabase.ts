import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'tajer_supabase_url';
const STORAGE_ANON_KEY = 'tajer_supabase_anon_key';

export const DEFAULT_SUPABASE_URL = 'https://ebzfioqhbsoiurcpzsnk.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViemZpb3FoYnNvaXVyY3B6c25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxODQ1NTAsImV4cCI6MjEwNTc2MDU1MH0.FeyHUdnOlkjBOtjA0972-Q0xKHFX6q0BJaD2AcSjnI4';

export function cleanSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  return rawUrl
    .trim()
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/+$/, '');
}

export function getSupabaseConfig(): { url: string; key: string } {
  const localUrl = localStorage.getItem(STORAGE_URL_KEY);
  const localKey = localStorage.getItem(STORAGE_ANON_KEY);
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  const url = cleanSupabaseUrl(localUrl || envUrl || DEFAULT_SUPABASE_URL);
  const key = (localKey || envKey || DEFAULT_SUPABASE_ANON_KEY).trim();

  return { url, key };
}

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || url.includes('demo-tajer-morocco')) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (e) {
      console.warn('Supabase client initialization skipped/failed:', e);
      return null;
    }
  }
  return supabaseClient;
}

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key && !url.includes('demo-tajer-morocco'));
};

export function setSupabaseConfig(url: string, key: string): void {
  const cleanUrl = cleanSupabaseUrl(url);
  const cleanKey = key.trim();
  localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
  localStorage.setItem(STORAGE_ANON_KEY, cleanKey);
  supabaseClient = null; // reset client to reinitialize
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_ANON_KEY);
  supabaseClient = null;
}

export async function testSupabaseConnection(urlToTest?: string, keyToTest?: string): Promise<{ success: boolean; message: string }> {
  try {
    const config = getSupabaseConfig();
    const targetUrl = cleanSupabaseUrl(urlToTest || config.url || '');
    const targetKey = (keyToTest || config.key || '').trim();

    if (!targetUrl || !targetKey) {
      return { success: false, message: 'يرجى إدخال رابط المشروع (URL) والمفتاح العام (Anon Key).' };
    }

    const testClient = createClient(targetUrl, targetKey);
    // Ping with a lightweight request
    const { error } = await testClient.from('products').select('count', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        // Table doesn't exist yet, but connection itself succeeded!
        return { 
          success: true, 
          message: 'تم الاتصال بـ Supabase بنجاح 100%! يرجى الآن تشغيل كود SQL لإنشاء الجداول في SQL Editor.' 
        };
      }
      return { success: false, message: `فشل الاتصال: ${error.message}` };
    }

    return { success: true, message: 'تم الاتصال بقاعدة بيانات Supabase بنجاح! الجداول موجودة والمزامنة جاهزة.' };
  } catch (err: any) {
    return { success: false, message: `خطأ في الاتصال: ${err?.message || 'تحقق من صحة الرابط والمفتاح'}` };
  }
}
