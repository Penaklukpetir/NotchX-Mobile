import { createClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'notchx_supabase_url';
const STORAGE_ANON_KEY = 'notchx_supabase_anon_key';

export function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl) return '';
  let clean = rawUrl.trim().replace(/\/+$/, '');
  if (clean.toLowerCase().endsWith('/rest/v1')) {
    clean = clean.slice(0, -'/rest/v1'.length).replace(/\/+$/, '');
  }
  return clean;
}

export function getStoredCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
  const localKey = localStorage.getItem(STORAGE_ANON_KEY) || '';

  return {
    url: normalizeSupabaseUrl(localUrl || envUrl),
    anonKey: (localKey || envKey).trim()
  };
}

export function saveStoredCredentials(url, anonKey) {
  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = (anonKey || '').trim();
  if (cleanUrl) localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
  else localStorage.removeItem(STORAGE_URL_KEY);

  if (cleanKey) localStorage.setItem(STORAGE_ANON_KEY, cleanKey);
  else localStorage.removeItem(STORAGE_ANON_KEY);
}

export function createNotchXSupabaseClient() {
  const { url, anonKey } = getStoredCredentials();
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
}
