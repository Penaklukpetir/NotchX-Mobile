import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Disc3,
  Sliders,
  Terminal,
  Link2,
  Palette,
  Mic,
  MicOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  createNotchXSupabaseClient,
  getStoredCredentials,
  saveStoredCredentials
} from './lib/supabase';
import {
  syncWidgetCredentials,
  registerWidgetDeepLinks
} from './lib/widgetBridge';
import {
  extractTelemetryFromResult,
  extractVisionResult
} from './lib/commandParsers';
import { MediaPlayerCard } from './components/MediaPlayerCard';
import { TelemetrySliders } from './components/TelemetrySliders';
import { QuickActionsGrid } from './components/QuickActionsGrid';
import { CommandTab } from './components/CommandTab';
import { PairingModal, ClipboardModal, LockConfirmModal } from './components/Modals';
import { VisionResultModal } from './components/VisionResultModal';
import {
  triggerHaptic,
  type ThemeOption,
  type NotchXCommandRow,
  type FileSuggestion,
  type MediaState,
  type IslandStatus,
  type NavTab,
  type VisionResultData,
  type DeviceStateTelemetry
} from './types/notchx';

const THEMES: ThemeOption[] = [
  { id: 'ObsidianGold', label: 'Obsidian Gold', hex: '#E5C158', rgb: '229, 193, 88' },
  { id: 'MidnightSapphire', label: 'Midnight Sapphire', hex: '#38BDF8', rgb: '56, 189, 248' },
  { id: 'EmeraldVelvet', label: 'Emerald Velvet', hex: '#34D399', rgb: '52, 211, 153' },
  { id: 'CrimsonNeon', label: 'Crimson Neon', hex: '#FB7185', rgb: '251, 113, 133' },
  { id: 'FrostedPearl', label: 'Frosted Pearl', hex: '#E4E4E7', rgb: '228, 228, 231' }
];

const INITIAL_MEDIA: MediaState = {
  title: 'Windows Media Sync',
  artist: 'Ready for Playback Control',
  source: 'SPOTIFY',
  isPlaying: false,
  progress: 42,
  elapsedSec: 102,
  durationSec: 218,
  currentLyric: '“Tap Play or control Windows audio directly from NotchX...”',
  nextLyric: 'Live track telemetry & synchronized lyrics appear here',
  shuffle: false,
  repeat: false
};

const LOCAL_ECHO_LOCKOUT_MS = 1200;

interface SpeechRecognitionAlternative {
  transcript?: string;
}

interface SpeechRecognitionResultItem {
  isFinal?: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEventLike {
  resultIndex?: number;
  results?: {
    length: number;
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
  message?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface NativeSpeechBridge {
  isAvailable?: () => boolean;
  startSpeech?: (lang: string) => void;
}

interface ToastBanner {
  type: 'success' | 'error';
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    NotchXVoice?: NativeSpeechBridge;
  }
}

export default function App() {
  const [supabase, setSupabase] = useState(() => createNotchXSupabaseClient());
  const [islandState, setIslandState] = useState<IslandStatus>('connected');
  const [realtimeLive, setRealtimeLive] = useState(false);
  const [showThemeBar, setShowThemeBar] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeOption>(THEMES[0]);
  const [activeTab, setActiveTab] = useState<NavTab>('media');

  const [media, setMedia] = useState<MediaState>(INITIAL_MEDIA);
  const [volume, setVolume] = useState(68);
  const [brightness, setBrightness] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [miniPillActive, setMiniPillActive] = useState(false);

  const [isScanningVision, setIsScanningVision] = useState(false);
  const [visionResult, setVisionResult] = useState<VisionResultData | null>(null);

  const [promptText, setPromptText] = useState('');
  const [speechLang, setSpeechLang] = useState<'id-ID' | 'en-US'>('id-ID');
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [toast, setToast] = useState<ToastBanner | null>(null);

  const [commands, setCommands] = useState<NotchXCommandRow[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, string | boolean>>({});

  const [showPairingModal, setShowPairingModal] = useState(false);
  const [showClipboardModal, setShowClipboardModal] = useState(false);
  const [clipboardInput, setClipboardInput] = useState('');
  const [showLockConfirm, setShowLockConfirm] = useState(false);

  const [settingsUrl, setSettingsUrl] = useState('');
  const [settingsKey, setSettingsKey] = useState('');
  const [deviceId, setDeviceId] = useState('windows');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const promptInputRef = useRef<HTMLInputElement | null>(null);
  const lastLocalActionAt = useRef<number>(0);
  const pendingVisionCmdIdRef = useRef<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const transcriptSentRef = useRef<boolean>(false);
  const latestTranscriptRef = useRef<string>('');

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3800);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const markLocalAction = useCallback(() => {
    lastLocalActionAt.current = Date.now();
  }, []);

  const applyRemoteTelemetry = useCallback((telemetry: DeviceStateTelemetry) => {
    const withinLockout = Date.now() - lastLocalActionAt.current < LOCAL_ECHO_LOCKOUT_MS;

    setMedia((prev) => ({
      ...prev,
      title: telemetry.title ?? prev.title,
      artist: telemetry.artist ?? prev.artist,
      albumArt: telemetry.album_art ?? prev.albumArt,
      source: telemetry.source ?? prev.source,
      currentLyric: telemetry.active_lyric ?? prev.currentLyric,
      nextLyric: telemetry.next_lyric ?? prev.nextLyric,
      isPlaying: !withinLockout && telemetry.is_playing !== undefined
        ? telemetry.is_playing
        : prev.isPlaying
    }));

    if (!withinLockout) {
      if (typeof telemetry.volume === 'number') setVolume(telemetry.volume);
      if (typeof telemetry.brightness === 'number') setBrightness(telemetry.brightness);
      if (typeof telemetry.is_muted === 'boolean') setIsMuted(telemetry.is_muted);
      if (typeof telemetry.mic_muted === 'boolean') setIsMicMuted(telemetry.mic_muted);
      if (typeof telemetry.mini_pill === 'boolean') setMiniPillActive(telemetry.mini_pill);
    }
  }, []);

  // Sync dynamic accent CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--nx-accent', activeTheme.hex);
    document.documentElement.style.setProperty('--nx-accent-rgb', activeTheme.rgb);
  }, [activeTheme]);

  // Smooth local track progress tick when playing
  useEffect(() => {
    if (!media.isPlaying) return;
    const timer = window.setInterval(() => {
      setMedia((prev) => {
        const nextElapsed = prev.elapsedSec + 1;
        if (nextElapsed >= prev.durationSec) {
          return { ...prev, elapsedSec: 0, progress: 0 };
        }
        return {
          ...prev,
          elapsedSec: nextElapsed,
          progress: Math.round((nextElapsed / Math.max(1, prev.durationSec)) * 100)
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [media.isPlaying]);

  // Clear file upload spinners automatically when fetch_file completes
  useEffect(() => {
    setUploadingFiles((prev) => {
      const entries = Object.entries(prev);
      if (entries.length === 0) return prev;

      let changed = false;
      const next = { ...prev };

      for (const [fullPath, trackedCmdId] of entries) {
        const match = commands.find((c) => {
          if (trackedCmdId && String(c.id) === String(trackedCmdId)) return true;
          if (c.command_type === 'fetch_file' && c.payload) {
            const p =
              typeof c.payload === 'string'
                ? (() => {
                    try {
                      return JSON.parse(c.payload) as Record<string, string>;
                    } catch {
                      return null;
                    }
                  })()
                : (c.payload as Record<string, string>);
            return p?.file_path === fullPath;
          }
          return false;
        });

        if (
          match &&
          (match.status === 'executed' ||
            match.status === 'completed' ||
            match.status === 'error')
        ) {
          delete next[fullPath];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [commands]);

  const fetchRecentCommands = useCallback(
    async (client: typeof supabase) => {
      if (!client) return;
      const target = (deviceId || 'windows').trim();
      const { data, error } = await client
        .from('notchx_commands')
        .select('*')
        .eq('target_device', target)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && Array.isArray(data)) {
        const rows = data as NotchXCommandRow[];
        setCommands(rows);

        for (const row of rows) {
          const telemetry = extractTelemetryFromResult(row.result_text);
          if (telemetry) {
            applyRemoteTelemetry(telemetry);
            break;
          }
        }

        if (pendingVisionCmdIdRef.current) {
          const finishedVision = rows.find(
            (r) =>
              String(r.id) === String(pendingVisionCmdIdRef.current) &&
              (r.status === 'executed' || r.status === 'completed' || r.status === 'error')
          );
          if (finishedVision) {
            pendingVisionCmdIdRef.current = null;
            setIsScanningVision(false);
            if (finishedVision.status !== 'error' && finishedVision.result_text) {
              const parsed = extractVisionResult(
                String(finishedVision.id),
                finishedVision.result_text,
                finishedVision.created_at
              );
              if (parsed) setVisionResult(parsed);
            }
          }
        }
      }
    },
    [deviceId, applyRemoteTelemetry]
  );

  // Startup credential sync + Instant Supabase Realtime WebSocket Subscriptions
  useEffect(() => {
    const creds = getStoredCredentials();
    setSettingsUrl(creds.url);
    setSettingsKey(creds.anonKey);
    const activeDeviceId = creds.deviceId || 'windows';
    setDeviceId(activeDeviceId);

    void syncWidgetCredentials({
      supabaseUrl: creds.url,
      supabaseAnonKey: creds.anonKey,
      deviceId: activeDeviceId,
      deviceName: activeDeviceId,
      userId: 'default_user'
    });

    if (!supabase) {
      setIslandState('unconfigured');
      setRealtimeLive(false);
      return;
    }

    setIslandState('connected');
    void fetchRecentCommands(supabase);

    const channel = supabase
      .channel(`notchx-realtime-${activeDeviceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notchx_commands',
          filter: `target_device=eq.${activeDeviceId}`
        },
        (payload) => {
          const row = payload.new as NotchXCommandRow | undefined;
          if (!row) return;

          setCommands((prev) => {
            const exists = prev.some((item) => String(item.id) === String(row.id));
            if (exists) {
              return prev.map((item) =>
                String(item.id) === String(row.id) ? { ...item, ...row } : item
              );
            }
            return [row, ...prev];
          });

          const telemetry = extractTelemetryFromResult(row.result_text);
          if (telemetry) applyRemoteTelemetry(telemetry);

          if (
            (row.command_type === 'vision_scan' ||
              String(row.id) === String(pendingVisionCmdIdRef.current)) &&
            (row.status === 'executed' || row.status === 'completed' || row.status === 'error')
          ) {
            pendingVisionCmdIdRef.current = null;
            setIsScanningVision(false);
            if (row.status !== 'error' && row.result_text) {
              const parsed = extractVisionResult(String(row.id), row.result_text, row.created_at);
              if (parsed) setVisionResult(parsed);
            }
          }

          if (row.status === 'executed' || row.status === 'completed') {
            triggerHaptic(18);
            setIslandState('done');
            window.setTimeout(() => setIslandState('connected'), 1800);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notchx_device_state',
          filter: `device_id=eq.${activeDeviceId}`
        },
        (payload) => {
          const rec = payload.new as DeviceStateTelemetry | undefined;
          if (rec) applyRemoteTelemetry(rec);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_state',
          filter: `device_id=eq.${activeDeviceId}`
        },
        (payload) => {
          const rec = payload.new as DeviceStateTelemetry | undefined;
          if (rec) applyRemoteTelemetry(rec);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vision_results',
          filter: `device_id=eq.${activeDeviceId}`
        },
        (payload) => {
          const rec = payload.new as Record<string, unknown> | undefined;
          if (!rec) return;
          pendingVisionCmdIdRef.current = null;
          setIsScanningVision(false);
          triggerHaptic(22);
          setVisionResult({
            id: String(rec.id || Date.now()),
            screenshotUrl:
              (rec.screenshot_url as string) ||
              (rec.image_url as string) ||
              undefined,
            explanation:
              (rec.explanation as string) ||
              (rec.analysis as string) ||
              (rec.result_text as string) ||
              'Screen analysis complete.',
            createdAt: rec.created_at as string | undefined
          });
        }
      )
      .on('broadcast', { event: 'device_state' }, ({ payload }) => {
        if (payload) applyRemoteTelemetry(payload as DeviceStateTelemetry);
      })
      .subscribe((status) => {
        setRealtimeLive(status === 'SUBSCRIBED');
      });

    const pollInterval = window.setInterval(() => {
      void fetchRecentCommands(supabase);
    }, 3500);

    return () => {
      setRealtimeLive(false);
      window.clearInterval(pollInterval);
      void supabase.removeChannel(channel);
    };
  }, [supabase, fetchRecentCommands, applyRemoteTelemetry]);

  const dispatchRemoteCommand = useCallback(
    async (commandType: string, payloadInput: unknown) => {
      triggerHaptic(14);
      if (!supabase) {
        setShowPairingModal(true);
        return null;
      }

      const targetDevice = (deviceId || 'windows').trim();
      setIslandState('executing');

      const structuredPayload =
        typeof payloadInput === 'object' && payloadInput !== null
          ? payloadInput
          : commandType === 'theme_sync'
          ? { theme: payloadInput }
          : commandType === 'media_control' || commandType === 'system_action'
          ? { action: payloadInput }
          : { prompt: payloadInput };

      const optimisticId = `temp-${Date.now()}`;
      const optimisticRow: NotchXCommandRow = {
        id: optimisticId,
        source_device: 'android',
        target_device: targetDevice,
        command_type: commandType,
        payload: structuredPayload,
        status: 'pending',
        result_text: '',
        created_at: new Date().toISOString()
      };

      setCommands((prev) => [optimisticRow, ...prev]);

      const { data, error } = await supabase
        .from('notchx_commands')
        .insert([
          {
            source_device: 'android',
            target_device: targetDevice,
            command_type: commandType,
            payload: structuredPayload,
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (error) {
        setCommands((prev) =>
          prev.map((c) =>
            c.id === optimisticId
              ? { ...c, status: 'error', result_text: `Supabase error: ${error.message}` }
              : c
          )
        );
        setIslandState('connected');
        return null;
      }

      if (data) {
        const inserted = data as NotchXCommandRow;
        setCommands((prev) => prev.map((c) => (c.id === optimisticId ? inserted : c)));
        return inserted;
      }
      return null;
    },
    [supabase, deviceId]
  );

  // Emit final voice transcription to Windows via Supabase
  const sendFinalVoiceCommand = useCallback(
    async (transcript: string) => {
      const clean = transcript.trim();
      if (!clean) return;
      setPromptText(clean);
      const res = await dispatchRemoteCommand('voice_command', {
        command: 'voice_command',
        text: clean
      });
      if (res) {
        showToast('success', `Perintah terkirim: ${clean}`);
      } else {
        showToast('error', 'Gagal mengirim perintah suara ke Supabase.');
      }
    },
    [dispatchRemoteCommand, showToast]
  );

  // Listen for native Android SpeechRecognizer events from MainActivity.java
  useEffect(() => {
    const onNativeSpeech = (event: Event) => {
      const custom = event as CustomEvent<{ text?: string; error?: string }>;
      const detail = custom.detail || {};
      setIsListening(false);
      setLiveTranscript('');

      if (detail.text && detail.text.trim()) {
        void sendFinalVoiceCommand(detail.text);
      } else if (detail.error && detail.error !== 'cancelled') {
        if (detail.error === 'permission_required') {
          showToast('error', 'Izin mikrofon Android diperlukan. Aktifkan izin Mic di Pengaturan.');
        } else {
          showToast('error', `Suara gagal dikenali (${detail.error}).`);
        }
        setIslandState('connected');
      } else {
        setIslandState('connected');
      }
    };

    window.addEventListener('notchxNativeSpeechResult', onNativeSpeech);
    return () => window.removeEventListener('notchxNativeSpeechResult', onNativeSpeech);
  }, [sendFinalVoiceCommand, showToast]);

  // Optimistic Media & Hardware Handlers (0ms UI + 1200ms echo guard)
  const handlePlayPause = () => {
    markLocalAction();
    setMedia((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    void dispatchRemoteCommand('media_control', { action: 'play_pause' });
  };

  const handlePrevTrack = () => {
    markLocalAction();
    void dispatchRemoteCommand('media_control', { action: 'previous' });
  };

  const handleNextTrack = () => {
    markLocalAction();
    void dispatchRemoteCommand('media_control', { action: 'next' });
  };

  const handleMicToggle = () => {
    markLocalAction();
    setIsMicMuted((prev) => !prev);
    void dispatchRemoteCommand('media_control', { action: 'toggle_mic' });
  };

  const handleMuteToggle = () => {
    markLocalAction();
    setIsMuted((prev) => !prev);
    void dispatchRemoteCommand('media_control', { action: 'mute' });
  };

  const handleNotchMiniPill = () => {
    markLocalAction();
    setMiniPillActive((prev) => !prev);
    void dispatchRemoteCommand('toggle_mini_pill', {
      action: 'toggle_mini_pill',
      prompt: 'Show a NotchX Remote Mini-Pill alert banner saying "Synced from Phone"'
    });
  };

  const handleVisionScan = async () => {
    triggerHaptic(16);
    setIsScanningVision(true);
    const inserted = await dispatchRemoteCommand('vision_scan', {
      action: 'vision_scan',
      prompt: 'Analyze my current laptop screen and explain in Indonesian what is visible right now'
    });
    if (inserted?.id) {
      pendingVisionCmdIdRef.current = String(inserted.id);
    } else {
      setIsScanningVision(false);
    }
  };

  const handleFetchFileFromLaptop = async (file: FileSuggestion) => {
    if (!file?.fullPath || uploadingFiles[file.fullPath]) return;
    triggerHaptic(18);
    setUploadingFiles((prev) => ({ ...prev, [file.fullPath]: true }));

    const inserted = await dispatchRemoteCommand('fetch_file', {
      file_path: file.fullPath,
      file_name: file.fileName
    });

    if (inserted?.id) {
      setUploadingFiles((prev) => ({ ...prev, [file.fullPath]: inserted.id }));
    } else {
      setUploadingFiles((prev) => {
        const copy = { ...prev };
        delete copy[file.fullPath];
        return copy;
      });
    }
  };

  const handleSendPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = promptText.trim();
    if (!clean) return;
    setPromptText('');
    const res = await dispatchRemoteCommand('gemini_prompt', { prompt: clean });
    if (res) showToast('success', `Perintah terkirim: ${clean}`);
  };

  const handleThemeSync = async (themeObj: ThemeOption) => {
    triggerHaptic(14);
    setActiveTheme(themeObj);
    setShowThemeBar(false);
    await dispatchRemoteCommand('theme_sync', { theme: themeObj.id });
  };

  // Multi-tier Voice Recognition (Web Speech API -> Native Android Bridge -> getUserMedia/MediaRecorder Fallback)
  const toggleVoiceRecognition = useCallback(async () => {
    triggerHaptic(18);

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    // Tier 1: Standard Web Speech API (Chrome / Edge / modern browsers)
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = speechLang;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      transcriptSentRef.current = false;
      latestTranscriptRef.current = '';

      recognition.onstart = () => {
        setIsListening(true);
        setLiveTranscript('');
        setIslandState('executing');
      };

      recognition.onresult = (event) => {
        if (!event.results) return;
        let combined = '';
        let hasFinal = false;

        for (let i = 0; i < event.results.length; i++) {
          const resItem = event.results[i];
          const textPiece = resItem?.[0]?.transcript || '';
          combined += textPiece;
          if (resItem?.isFinal) hasFinal = true;
        }

        const cleanCombined = combined.trim();
        latestTranscriptRef.current = cleanCombined;
        setLiveTranscript(cleanCombined);

        if (hasFinal && cleanCombined && !transcriptSentRef.current) {
          transcriptSentRef.current = true;
          setIsListening(false);
          void sendFinalVoiceCommand(cleanCombined);
        }
      };

      recognition.onerror = (errEvt) => {
        setIsListening(false);
        setLiveTranscript('');
        setIslandState('connected');
        const code = errEvt?.error || 'unknown';
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          showToast('error', 'Akses mikrofon ditolak. Izinkan mikrofon pada perangkat Anda.');
        } else if (code === 'no-speech') {
          showToast('error', 'Tidak ada suara terdeteksi. Coba bicara lebih dekat.');
        } else if (code !== 'aborted') {
          showToast('error', `Error pengenalan suara: ${code}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const leftover = latestTranscriptRef.current.trim();
        if (leftover && !transcriptSentRef.current) {
          transcriptSentRef.current = true;
          void sendFinalVoiceCommand(leftover);
        } else if (!transcriptSentRef.current) {
          setIslandState('connected');
        }
        setLiveTranscript('');
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        setIsListening(false);
        showToast('error', 'Gagal memulai pengenalan suara Web Speech.');
      }
      return;
    }

    // Tier 2: Capacitor Android Native Speech Bridge (MainActivity.java)
    if (window.NotchXVoice?.startSpeech) {
      setIsListening(true);
      setLiveTranscript('');
      setIslandState('executing');
      window.NotchXVoice.startSpeech(speechLang);
      return;
    }

    // Tier 3: WebView / Browser fallback via getUserMedia + MediaRecorder permission check
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const hasRecorder = typeof MediaRecorder !== 'undefined';
        if (hasRecorder) {
          const recorder = new MediaRecorder(stream);
          recorder.start();
          window.setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop();
            stream.getTracks().forEach((t) => t.stop());
          }, 300);
        } else {
          stream.getTracks().forEach((t) => t.stop());
        }
        showToast(
          'error',
          'Mikrofon aktif, tetapi WebView ini belum mendukung transkripsi teks otomatis. Gunakan aplikasi Android NotchX terbaru atau ketik perintah.'
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Izin mikrofon ditolak';
        showToast('error', `Akses mikrofon diblokir: ${msg}`);
      }
      return;
    }

    showToast('error', 'Perangkat/browser ini tidak mendukung fitur mikrofon.');
  }, [isListening, speechLang, sendFinalVoiceCommand, showToast]);

  // Register Android Widget Deep Links (notchx://voice & notchx://files)
  useEffect(() => {
    return registerWidgetDeepLinks({
      onVoiceTrigger: () => {
        setActiveTab('command');
        window.setTimeout(() => {
          void toggleVoiceRecognition();
        }, 250);
      },
      onFileSearchTrigger: () => {
        setActiveTab('command');
        setPromptText('Cari file ');
        window.setTimeout(() => {
          promptInputRef.current?.focus();
        }, 200);
      }
    });
  }, [toggleVoiceRecognition]);

  const handleSavePairing = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDevice = deviceId.trim() || 'windows';
    saveStoredCredentials(settingsUrl, settingsKey, cleanDevice);
    void syncWidgetCredentials({
      supabaseUrl: settingsUrl,
      supabaseAnonKey: settingsKey,
      deviceId: cleanDevice,
      deviceName: cleanDevice,
      userId: 'default_user'
    });
    const nextClient = createNotchXSupabaseClient();
    setSupabase(nextClient);
    setDeviceId(cleanDevice);
    setShowPairingModal(false);
  };

  const handleCopyResult = async (id: string, text: string) => {
    if (!text) return;
    triggerHaptic(10);
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  const isDesktopOnline = islandState !== 'unconfigured' && islandState !== 'offline';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#09090B] text-[#FAFAFA] select-none antialiased">
      {/* STICKY TOP HEADER (z-40) */}
      <header className="sticky top-0 z-40 bg-[#09090B]/95 backdrop-blur-md border-b border-[#27272A] pt-safe">
        <div className="h-14 px-4 flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#121215] border border-[#27272A] flex items-center justify-center gap-1 shrink-0">
              <span
                className="nx-eye w-1.5 h-2 rounded-full inline-block"
                style={{ backgroundColor: activeTheme.hex }}
              />
              <span
                className="nx-eye w-1.5 h-2 rounded-full inline-block"
                style={{ backgroundColor: activeTheme.hex }}
              />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <span className="font-display text-base font-bold tracking-tight text-[#FAFAFA]">
                NotchX
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border font-mono text-[9px] font-semibold tracking-wider uppercase ${
                  islandState === 'unconfigured'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : islandState === 'executing'
                    ? 'bg-[#E5C158]/15 border-[#E5C158]/40 text-[#E5C158]'
                    : 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    islandState === 'unconfigured'
                      ? 'bg-rose-400'
                      : islandState === 'executing'
                      ? 'bg-[#E5C158] animate-ping'
                      : 'bg-[#10B981] animate-pulse'
                  }`}
                />
                {islandState === 'unconfigured'
                  ? 'OFFLINE'
                  : islandState === 'executing'
                  ? 'SYNCING'
                  : realtimeLive
                  ? 'LIVE'
                  : 'DESKTOP ONLINE'}
              </span>
            </div>
          </div>

          {/* Right Quick Actions: Voice Trigger, Theme, Pair */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void toggleVoiceRecognition()}
              aria-label="Quick Voice Command"
              className={`w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${
                isListening
                  ? 'bg-[#E5C158] border-[#E5C158] text-[#09090B] animate-pulse shadow-[0_0_16px_rgba(229,193,88,0.55)]'
                  : 'bg-[#121215] border-[#27272A] text-[#E5C158] hover:border-[#E5C158]/60'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setShowThemeBar((v) => !v);
              }}
              aria-label="Theme Switcher"
              className="w-9 h-9 rounded-xl bg-[#121215] border border-[#27272A] flex items-center justify-center active:scale-95 transition-transform"
            >
              <Palette className="w-4 h-4" style={{ color: activeTheme.hex }} />
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setShowPairingModal(true);
              }}
              aria-label="Pairing & Settings"
              className="h-9 px-2.5 rounded-xl bg-[#121215] border border-[#27272A] text-[#FAFAFA] flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Link2 className="w-3.5 h-3.5" style={{ color: activeTheme.hex }} />
              <span className="font-mono text-[10px] font-semibold uppercase">Pair</span>
            </button>
          </div>
        </div>

        {/* Quick Theme Strip */}
        {showThemeBar && (
          <div className="px-4 pb-3 pt-1 border-t border-[#27272A]/60 max-w-md mx-auto grid grid-cols-5 gap-1.5">
            {THEMES.map((t) => {
              const selected = t.id === activeTheme.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => void handleThemeSync(t)}
                  className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-xl border transition-all active:scale-95 ${
                    selected
                      ? 'bg-[#201F22] border-[#E5C158]/60'
                      : 'bg-[#121215] border-[#27272A] opacity-75'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: t.hex }}
                  />
                  <span className="text-[9px] font-medium text-[#D0C5B1] truncate w-full text-center">
                    {t.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* FLOATING LISTENING / TOAST BANNER (Zero tap blockage) */}
      {(isListening || toast) && (
        <div className="fixed top-16 inset-x-0 z-40 px-4 pt-2 flex justify-center pointer-events-none">
          {isListening ? (
            <div className="w-full max-w-md rounded-2xl bg-[#121215]/95 backdrop-blur-md border border-[#E5C158] px-4 py-3 flex items-center justify-between gap-3 shadow-[0_0_24px_-4px_rgba(229,193,88,0.45)] pointer-events-auto">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5C158] animate-ping shrink-0" />
                <div className="min-w-0">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#E5C158]">
                    Mendengarkan ({speechLang})...
                  </div>
                  <div className="text-xs text-[#FAFAFA] truncate">
                    {liveTranscript || 'Ucapkan perintah suara ke laptop...'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void toggleVoiceRecognition()}
                className="px-2.5 py-1 rounded-lg bg-[#E5C158] text-[#09090B] font-mono text-[10px] font-bold uppercase shrink-0"
              >
                Stop
              </button>
            </div>
          ) : toast ? (
            <div
              className={`w-full max-w-md rounded-2xl backdrop-blur-md px-4 py-2.5 flex items-center gap-2.5 shadow-xl pointer-events-auto border ${
                toast.type === 'success'
                  ? 'bg-[#121215]/95 border-[#E5C158]/70 text-[#FAFAFA]'
                  : 'bg-[#181012]/95 border-rose-500/60 text-rose-200'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#E5C158] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="text-xs font-medium truncate">{toast.message}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* SCROLLABLE CONTENT AREA */}
      <main className="flex-1 overflow-y-auto px-4 pt-3 pb-24 w-full max-w-md mx-auto">
        {activeTab === 'media' && (
          <MediaPlayerCard
            media={media}
            accentHex={activeTheme.hex}
            onPlayPause={handlePlayPause}
            onPrev={handlePrevTrack}
            onNext={handleNextTrack}
            onToggleShuffle={() => {
              triggerHaptic(10);
              setMedia((prev) => ({ ...prev, shuffle: !prev.shuffle }));
            }}
            onToggleRepeat={() => {
              triggerHaptic(10);
              setMedia((prev) => ({ ...prev, repeat: !prev.repeat }));
            }}
            onSeek={(pct) => {
              markLocalAction();
              setMedia((prev) => ({
                ...prev,
                progress: pct,
                elapsedSec: Math.round((pct / 100) * prev.durationSec)
              }));
            }}
          />
        )}

        {activeTab === 'remote' && (
          <div className="flex flex-col gap-5">
            <TelemetrySliders
              volume={volume}
              brightness={brightness}
              isMuted={isMuted}
              accentHex={activeTheme.hex}
              onVolumeChange={(v) => {
                markLocalAction();
                setIsMuted(false);
                setVolume(v);
              }}
              onVolumeCommit={(v) => {
                markLocalAction();
                void dispatchRemoteCommand('gemini_prompt', {
                  prompt: `Set my Windows laptop master volume to ${v}% using control_media_and_audio set_volume`
                });
              }}
              onBrightnessChange={(v) => {
                markLocalAction();
                setBrightness(v);
              }}
              onBrightnessCommit={(v) => {
                markLocalAction();
                void dispatchRemoteCommand('gemini_prompt', {
                  prompt: `Set my Windows display brightness to ${v}% using control_system brightness`
                });
              }}
            />

            <QuickActionsGrid
              isMuted={isMuted}
              isMicMuted={isMicMuted}
              isScanningVision={isScanningVision}
              miniPillActive={miniPillActive}
              isConnected={isDesktopOnline}
              accentHex={activeTheme.hex}
              onMicToggle={handleMicToggle}
              onVisionScan={() => void handleVisionScan()}
              onMuteToggle={handleMuteToggle}
              onNotchMiniPill={handleNotchMiniPill}
              onFindFile={() => {
                triggerHaptic(12);
                setActiveTab('command');
                setPromptText('Cari file ');
                window.setTimeout(() => promptInputRef.current?.focus(), 120);
              }}
              onLockRequest={() => {
                triggerHaptic(14);
                setShowLockConfirm(true);
              }}
            />
          </div>
        )}

        {activeTab === 'command' && (
          <CommandTab
            promptText={promptText}
            speechLang={speechLang}
            isListening={isListening}
            liveTranscript={liveTranscript}
            isScanningVision={isScanningVision}
            accentHex={activeTheme.hex}
            inputRef={promptInputRef}
            commands={commands}
            copiedId={copiedId}
            uploadingFiles={uploadingFiles}
            onChangePrompt={setPromptText}
            onToggleSpeechLang={() => {
              triggerHaptic(8);
              setSpeechLang((l) => (l === 'id-ID' ? 'en-US' : 'id-ID'));
            }}
            onToggleVoice={() => void toggleVoiceRecognition()}
            onSubmit={(e) => void handleSendPrompt(e)}
            onOpenClipboard={() => {
              triggerHaptic(10);
              setShowClipboardModal(true);
            }}
            onVisionScan={() => void handleVisionScan()}
            onClearIsland={() => {
              void dispatchRemoteCommand('toggle_mini_pill', {
                action: 'clear_island',
                prompt: 'Collapse or clear NotchX Dynamic Island status banner'
              });
            }}
            onQuickFilePrompt={() => {
              triggerHaptic(10);
              setPromptText('Cari file ');
              promptInputRef.current?.focus();
            }}
            onRefreshFeed={() => {
              triggerHaptic(8);
              void fetchRecentCommands(supabase);
            }}
            onCopyResult={(id, text) => void handleCopyResult(id, text)}
            onFetchFile={(file) => void handleFetchFileFromLaptop(file)}
          />
        )}
      </main>

      {/* FIXED 3-TAB BOTTOM NAVIGATION BAR (z-50) */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#09090B]/95 backdrop-blur-md border-t border-[#27272A] pb-safe">
        <div className="grid grid-cols-3 h-16 max-w-md mx-auto">
          {(
            [
              { id: 'media', label: 'Media', Icon: Disc3 },
              { id: 'remote', label: 'Remote', Icon: Sliders },
              { id: 'command', label: 'Command', Icon: Terminal }
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setActiveTab(id);
                }}
                className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                  active ? 'font-semibold' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                }`}
                style={active ? { color: activeTheme.hex } : undefined}
              >
                <Icon className="w-5 h-5" />
                <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* VISION SCAN RESULT SHEET */}
      <VisionResultModal
        result={visionResult}
        isScanning={isScanningVision}
        accentHex={activeTheme.hex}
        onClose={() => setVisionResult(null)}
        onScanAgain={() => {
          setVisionResult(null);
          void handleVisionScan();
        }}
        onAskFollowUp={() => {
          setVisionResult(null);
          setActiveTab('command');
          setPromptText('Tentang layar PC tadi: ');
          window.setTimeout(() => promptInputRef.current?.focus(), 150);
        }}
      />

      {/* PAIRING & BRIDGE MODAL */}
      <PairingModal
        open={showPairingModal}
        isConnected={isDesktopOnline}
        supabaseUrl={settingsUrl}
        supabaseKey={settingsKey}
        deviceId={deviceId}
        accentHex={activeTheme.hex}
        onChangeUrl={setSettingsUrl}
        onChangeKey={setSettingsKey}
        onChangeDeviceId={setDeviceId}
        onSave={handleSavePairing}
        onClose={() => setShowPairingModal(false)}
      />

      {/* CLIPBOARD SYNC MODAL */}
      <ClipboardModal
        open={showClipboardModal}
        value={clipboardInput}
        accentHex={activeTheme.hex}
        onChange={setClipboardInput}
        onPull={() => {
          setShowClipboardModal(false);
          void dispatchRemoteCommand('gemini_prompt', {
            prompt: 'Read my current Windows clipboard text using clipboard_sync get and show it to me'
          });
        }}
        onPush={() => {
          const text = clipboardInput.trim();
          if (!text) return;
          setClipboardInput('');
          setShowClipboardModal(false);
          void dispatchRemoteCommand('gemini_prompt', {
            prompt: `Copy this exact text to my Windows clipboard using clipboard_sync set: ${text}`
          });
        }}
        onClose={() => setShowClipboardModal(false)}
      />

      {/* 2-STEP LOCK PC CONFIRMATION */}
      <LockConfirmModal
        open={showLockConfirm}
        onCancel={() => setShowLockConfirm(false)}
        onConfirm={() => {
          setShowLockConfirm(false);
          void dispatchRemoteCommand('system_action', {
            action: 'lock',
            command: 'lock_pc'
          });
        }}
      />
    </div>
  );
}
