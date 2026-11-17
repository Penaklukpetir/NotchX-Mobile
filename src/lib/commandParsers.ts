import {
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  FileCode,
  File,
  type LucideIcon
} from 'lucide-react';
import type { StructuredResult, DeviceStateTelemetry, VisionResultData } from '../types/notchx';

export function formatPayloadText(payload: unknown): string {
  if (!payload) return '';
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, string | undefined>;
        return (
          obj.prompt ||
          obj.theme ||
          obj.file_name ||
          obj.file_path ||
          obj.action ||
          obj.text ||
          payload
        );
      }
    } catch {
      // Plain string payload
    }
    return payload;
  }
  if (typeof payload === 'object') {
    const obj = payload as Record<string, string | undefined>;
    if (obj.file_name) return `Kirim File: ${obj.file_name}`;
    if (obj.action) return `Action: ${obj.action}`;
    return (
      obj.prompt ||
      obj.theme ||
      obj.file_path ||
      obj.text ||
      JSON.stringify(payload)
    );
  }
  return String(payload);
}

function extractJsonObjectAfterMarker(text: string, marker: string): Record<string, unknown> | null {
  const idx = text.indexOf(marker);
  const slice = idx >= 0 ? text.slice(idx + marker.length) : text;
  const firstBrace = slice.indexOf('{');
  const lastBrace = slice.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
  try {
    return JSON.parse(slice.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function parseStructuredResult(resultText?: string | null): StructuredResult | null {
  if (!resultText || typeof resultText !== 'string') return null;

  if (resultText.includes('__NOTCHX_FILE_SUGGESTIONS__')) {
    const data = extractJsonObjectAfterMarker(resultText, '__NOTCHX_FILE_SUGGESTIONS__');
    if (data) {
      const rawFiles = Array.isArray(data.files)
        ? data.files
        : Array.isArray(data.results)
          ? data.results
          : [];
      const files = rawFiles.map((raw) => {
        const f = (raw || {}) as Record<string, string | undefined>;
        return {
          fileName: f.fileName || f.file_name || f.name || 'Document',
          fullPath: f.fullPath || f.full_path || f.path || '',
          sizeFormatted: f.sizeFormatted || f.size_formatted || f.size || '',
          lastModified: f.lastModified || f.last_modified || f.modified || ''
        };
      });
      return {
        kind: 'file_suggestions',
        query: String(data.query || 'recent'),
        files
      };
    }
  }

  if (resultText.includes('__NOTCHX_FILE_READY__')) {
    const data = extractJsonObjectAfterMarker(resultText, '__NOTCHX_FILE_READY__');
    if (data) {
      return {
        kind: 'file_ready',
        fileName: String(data.fileName || data.file_name || 'Document'),
        sizeFormatted: String(data.sizeFormatted || data.size_formatted || data.size || ''),
        downloadUrl: String(data.downloadUrl || data.download_url || data.url || '')
      };
    }
  }

  return null;
}

export function extractTelemetryFromResult(
  resultText?: string | null
): DeviceStateTelemetry | null {
  if (!resultText) return null;
  if (!resultText.includes('__NOTCHX_MEDIA_STATE__') && !resultText.includes('__NOTCHX_DEVICE_STATE__')) {
    return null;
  }
  const marker = resultText.includes('__NOTCHX_DEVICE_STATE__')
    ? '__NOTCHX_DEVICE_STATE__'
    : '__NOTCHX_MEDIA_STATE__';
  const data = extractJsonObjectAfterMarker(resultText, marker);
  if (!data) return null;

  return {
    title: typeof data.title === 'string' ? data.title : undefined,
    artist: typeof data.artist === 'string' ? data.artist : undefined,
    album_art:
      typeof data.albumArt === 'string'
        ? data.albumArt
        : typeof data.album_art === 'string'
          ? data.album_art
          : undefined,
    source: typeof data.source === 'string' ? data.source : undefined,
    is_playing:
      typeof data.isPlaying === 'boolean'
        ? data.isPlaying
        : typeof data.is_playing === 'boolean'
          ? data.is_playing
          : undefined,
    active_lyric:
      typeof data.currentLyric === 'string'
        ? data.currentLyric
        : typeof data.active_lyric === 'string'
          ? data.active_lyric
          : undefined,
    next_lyric:
      typeof data.nextLyric === 'string'
        ? data.nextLyric
        : typeof data.next_lyric === 'string'
          ? data.next_lyric
          : undefined,
    volume: typeof data.volume === 'number' ? data.volume : undefined,
    brightness: typeof data.brightness === 'number' ? data.brightness : undefined,
    is_muted: typeof data.is_muted === 'boolean' ? data.is_muted : undefined,
    mic_muted: typeof data.mic_muted === 'boolean' ? data.mic_muted : undefined,
    mini_pill: typeof data.mini_pill === 'boolean' ? data.mini_pill : undefined
  };
}

function normalizeImageSrc(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `data:image/jpeg;base64,${trimmed}`;
}

export function normalizeVisionPayload(
  raw: Record<string, unknown>,
  fallbackId?: string
): { isError: true; errorMessage: string } | { isError: false; data: VisionResultData } {
  const errMsg =
    (typeof raw.error === 'string' && raw.error.trim()) ||
    (raw.type === 'vision_error' && typeof raw.explanation === 'string' && raw.explanation.trim()) ||
    '';

  if (raw.type === 'vision_error' || Boolean(raw.error)) {
    return {
      isError: true,
      errorMessage: errMsg || 'Vision Scan gagal pada laptop.'
    };
  }

  const screenshotUrl =
    normalizeImageSrc(raw.image_base64) ||
    normalizeImageSrc(raw.screenshot_url) ||
    normalizeImageSrc(raw.image_url) ||
    normalizeImageSrc(raw.imageUrl);

  const explanation =
    (typeof raw.explanation === 'string' && raw.explanation) ||
    (typeof raw.analysis === 'string' && raw.analysis) ||
    (typeof raw.summary === 'string' && raw.summary) ||
    (typeof raw.result_text === 'string' && raw.result_text) ||
    'Analisis layar PC selesai.';

  return {
    isError: false,
    data: {
      id: String(raw.id || fallbackId || Date.now()),
      screenshotUrl,
      explanation,
      createdAt:
        (typeof raw.created_at === 'string' && raw.created_at) ||
        (typeof raw.timestamp === 'string' && raw.timestamp) ||
        undefined
    }
  };
}

export function extractVisionResult(
  cmdId: string,
  resultText?: string | null,
  createdAt?: string
): VisionResultData | null {
  if (!resultText || typeof resultText !== 'string') return null;

  if (resultText.includes('__NOTCHX_VISION_RESULT__')) {
    const data = extractJsonObjectAfterMarker(resultText, '__NOTCHX_VISION_RESULT__');
    if (data) {
      const normalized = normalizeVisionPayload(data, cmdId);
      if (!normalized.isError) {
        return {
          ...normalized.data,
          createdAt: normalized.data.createdAt || createdAt
        };
      }
    }
  }

  return {
    id: cmdId,
    explanation: resultText,
    createdAt
  };
}

export function getFileVisualMeta(fileName = ''): {
  Icon: LucideIcon;
  badge: string;
  color: string;
} {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) {
    return { Icon: FileText, badge: ext.toUpperCase() || 'DOC', color: '#38BDF8' };
  }
  if (['pdf'].includes(ext)) {
    return { Icon: FileText, badge: 'PDF', color: '#FB7185' };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return { Icon: FileSpreadsheet, badge: ext.toUpperCase(), color: '#34D399' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { Icon: FileArchive, badge: ext.toUpperCase(), color: '#FBBF24' };
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    return { Icon: FileImage, badge: ext.toUpperCase(), color: '#C084FC' };
  }
  if (['json', 'js', 'ts', 'tsx', 'py', 'cs', 'html', 'css'].includes(ext)) {
    return { Icon: FileCode, badge: ext.toUpperCase(), color: '#E5C158' };
  }
  return { Icon: File, badge: (ext || 'FILE').toUpperCase().slice(0, 4), color: '#E5C158' };
}
