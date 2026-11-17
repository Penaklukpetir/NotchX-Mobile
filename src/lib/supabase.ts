import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'notchx_supabase_url';
const STORAGE_ANON_KEY = 'notchx_supabase_anon_key';
const STORAGE_DEVICE_ID_KEY = 'notchx_device_id';

export interface StoredCredentials {
  url: string;
  anonKey: string;
  deviceId: string;
}

export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let clean = rawUrl.trim().replace(/\/+$/, '');
  if (clean.toLowerCase().endsWith('/rest/v1')) {
    clean = clean.slice(0, -'/rest/v1'.length).replace(/\/+$/, '');
  }
  return clean;
}

export function getStoredCredentials(): StoredCredentials {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const envDevice = import.meta.env.VITE_NOTCHX_DEVICE_ID || 'windows';

  const localUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
  const localKey = localStorage.getItem(STORAGE_ANON_KEY) || '';
  const localDevice = localStorage.getItem(STORAGE_DEVICE_ID_KEY) || '';

  return {
    url: normalizeSupabaseUrl(localUrl || envUrl),
    anonKey: (localKey || envKey).trim(),
    deviceId: (localDevice || envDevice || 'windows').trim()
  };
}

export function saveStoredCredentials(url: string, anonKey: string, deviceId?: string): void {
  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = (anonKey || '').trim();
  const cleanDevice = (deviceId || 'windows').trim();

  if (cleanUrl) localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
  else localStorage.removeItem(STORAGE_URL_KEY);

  if (cleanKey) localStorage.setItem(STORAGE_ANON_KEY, cleanKey);
  else localStorage.removeItem(STORAGE_ANON_KEY);

  if (cleanDevice) localStorage.setItem(STORAGE_DEVICE_ID_KEY, cleanDevice);
  else localStorage.removeItem(STORAGE_DEVICE_ID_KEY);
}

export function createNotchXSupabaseClient(): SupabaseClient | null {
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
