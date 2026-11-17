import { Preferences } from '@capacitor/preferences';
import { getStoredCredentials } from './supabase';

export interface WidgetCredentials {
  supabaseUrl: string;
  supabaseAnonKey: string;
  deviceId?: string;
  userId?: string;
  deviceName?: string;
}

const WIDGET_PREFS_GROUP = 'NotchXWidgetPrefs';
const CAPACITOR_DEFAULT_GROUP = 'CapacitorStorage';

async function writePrefsGroup(group: string, payload: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  deviceId: string;
  userId: string;
  deviceName: string;
}): Promise<void> {
  await Preferences.configure({ group });
  await Promise.all([
    Preferences.set({ key: 'supabase_url', value: payload.supabaseUrl }),
    Preferences.set({ key: 'supabase_anon_key', value: payload.supabaseAnonKey }),
    Preferences.set({ key: 'device_id', value: payload.deviceId }),
    Preferences.set({ key: 'device_name', value: payload.deviceName }),
    Preferences.set({ key: 'user_id', value: payload.userId })
  ]);
}

/**
 * Syncs Supabase URL, Anon Key, and device_id into Android SharedPreferences
 * (`NotchXWidgetPrefs` and `CapacitorStorage`) so NotchXWidgetProvider /
 * NotchXCommandReceiver can fire background REST commands in < 300ms.
 */
export async function syncWidgetCredentials(overrides?: Partial<WidgetCredentials>): Promise<void> {
  try {
    const stored = getStoredCredentials();
    const supabaseUrl = (overrides?.supabaseUrl ?? stored.url ?? '').trim();
    const supabaseAnonKey = (overrides?.supabaseAnonKey ?? stored.anonKey ?? '').trim();
    const deviceId = (overrides?.deviceId ?? overrides?.deviceName ?? stored.deviceId ?? 'windows').trim() || 'windows';
    const deviceName = (overrides?.deviceName ?? deviceId).trim() || 'windows';
    const userId = (overrides?.userId ?? 'default_user').trim();

    const data = { supabaseUrl, supabaseAnonKey, deviceId, userId, deviceName };
    await writePrefsGroup(WIDGET_PREFS_GROUP, data);
    await writePrefsGroup(CAPACITOR_DEFAULT_GROUP, data);
  } catch {
    // Ignore when running in standard desktop browser without Capacitor runtime
  }
}

/**
 * Registers handlers for native widget deep links (`notchx://voice` and `notchx://files`)
 * as well as URL query fallbacks (`?widget_action=voice` / `?widget_action=files`).
 */
export function registerWidgetDeepLinks(handlers: {
  onVoiceTrigger: () => void;
  onFileSearchTrigger: () => void;
}): () => void {
  const handleUrlString = (rawUrl: string | null | undefined) => {
    if (!rawUrl) return;
    const lower = rawUrl.toLowerCase();
    if (lower.includes('notchx://voice') || lower.includes('widget_action=voice')) {
      handlers.onVoiceTrigger();
    } else if (lower.includes('notchx://files') || lower.includes('widget_action=files')) {
      handlers.onFileSearchTrigger();
    }
  };

  handleUrlString(window.location.href);
  handleUrlString(window.location.hash);

  const onNativeIntent = (event: Event) => {
    const custom = event as CustomEvent<string>;
    handleUrlString(custom.detail);
  };

  window.addEventListener('notchxWidgetDeepLink', onNativeIntent);
  return () => {
    window.removeEventListener('notchxWidgetDeepLink', onNativeIntent);
  };
}
