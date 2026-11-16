import { Preferences } from '@capacitor/preferences';
import { getStoredCredentials } from './supabase';

export interface WidgetCredentials {
  supabaseUrl: string;
  supabaseAnonKey: string;
  userId?: string;
  deviceName?: string;
}

/**
 * Syncs Supabase URL, Anon Key, and target device metadata into Android's
 * native "CapacitorStorage" SharedPreferences so NotchXWidgetProvider /
 * NotchXCommandReceiver can fire background REST commands in < 300ms.
 */
export async function syncWidgetCredentials(overrides?: Partial<WidgetCredentials>): Promise<void> {
  try {
    const stored = getStoredCredentials();
    const supabaseUrl = (overrides?.supabaseUrl ?? stored.url ?? '').trim();
    const supabaseAnonKey = (overrides?.supabaseAnonKey ?? stored.anonKey ?? '').trim();
    const userId = (overrides?.userId ?? 'default_user').trim();
    const deviceName = (overrides?.deviceName ?? 'windows').trim();

    await Promise.all([
      Preferences.set({ key: 'supabase_url', value: supabaseUrl }),
      Preferences.set({ key: 'supabase_anon_key', value: supabaseAnonKey }),
      Preferences.set({ key: 'user_id', value: userId }),
      Preferences.set({ key: 'device_name', value: deviceName })
    ]);
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

  // Check initial launch URL / query string
  handleUrlString(window.location.href);
  handleUrlString(window.location.hash);

  // Listen for custom DOM events dispatched by MainActivity onNewIntent
  const onNativeIntent = (event: Event) => {
    const custom = event as CustomEvent<string>;
    handleUrlString(custom.detail);
  };

  window.addEventListener('notchxWidgetDeepLink', onNativeIntent);
  return () => {
    window.removeEventListener('notchxWidgetDeepLink', onNativeIntent);
  };
}
