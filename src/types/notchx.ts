export interface ThemeOption {
  id: string;
  label: string;
  hex: string;
  rgb: string;
}

export interface NotchXCommandRow {
  id: string;
  source_device?: string;
  target_device: string;
  command_type: string;
  payload: unknown;
  status: string;
  result_text?: string;
  created_at?: string;
}

export interface FileSuggestion {
  fileName: string;
  fullPath: string;
  sizeFormatted: string;
  lastModified: string;
}

export type StructuredResult =
  | {
      kind: 'file_suggestions';
      query: string;
      files: FileSuggestion[];
    }
  | {
      kind: 'file_ready';
      fileName: string;
      sizeFormatted: string;
      downloadUrl: string;
    };

export interface MediaState {
  title: string;
  artist: string;
  albumArt?: string;
  source: string;
  isPlaying: boolean;
  progress: number;
  elapsedSec: number;
  durationSec: number;
  currentLyric: string;
  nextLyric: string;
  shuffle: boolean;
  repeat: boolean;
}

export interface VisionResultData {
  id: string;
  screenshotUrl?: string;
  explanation: string;
  createdAt?: string;
}

export interface DeviceStateTelemetry {
  is_playing?: boolean;
  title?: string;
  artist?: string;
  album_art?: string;
  source?: string;
  active_lyric?: string;
  next_lyric?: string;
  volume?: number;
  brightness?: number;
  is_muted?: boolean;
  mic_muted?: boolean;
  mini_pill?: boolean;
}

export type IslandStatus = 'connected' | 'executing' | 'done' | 'unconfigured' | 'offline';

export type NavTab = 'media' | 'remote' | 'command';

export function triggerHaptic(ms = 12): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch {
      // Ignore on unsupported runtimes
    }
  }
}

export function formatSeconds(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
