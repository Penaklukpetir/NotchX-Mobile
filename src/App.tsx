import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowUp,
  AudioWaveform,
  Clipboard,
  Cpu,
  LayoutGrid,
  Link2,
  Maximize2,
  Mic,
  MicOff,
  Palette,
  Smartphone
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
import { extractMediaUpdateFromResult } from './lib/commandParsers';
import { MediaPlayerCard } from './components/MediaPlayerCard';
import { TelemetrySliders } from './components/TelemetrySliders';
import { QuickActionsGrid } from './components/QuickActionsGrid';
import { CommandFeed } from './components/CommandFeed';
import { PairingModal, ClipboardModal, LockConfirmModal } from './components/Modals';
import {
  triggerHaptic,
  type ThemeOption,
  type NotchXCommandRow,
  type FileSuggestion,
  type MediaState,
  type IslandStatus,
  type NavTab
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
  source: 'WinAudio',
  isPlaying: false,
  progress: 42,
  elapsedSec: 102,
  durationSec: 218,
  currentLyric: '“Tap Play or control Windows audio directly from NotchX...”',
  nextLyric: 'Live track telemetry & synchronized lyrics sync automatically',
  shuffle: false,
  repeat: false
};

interface SpeechRecognitionAlternative {
  transcript?: string;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEventLike {
  results?: { [index: number]: SpeechRecognitionResult };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export default function App() {
  const [supabase, setSupabase] = useState(() => createNotchXSupabaseClient());
  const [islandState, setIslandState] = useState<IslandStatus>('connected');
  const [islandDetail, setIslandDetail] = useState('Desktop Linked');
  const [islandExpanded, setIslandExpanded] = useState(false);
  const [miniPillActive, setMiniPillActive] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeOption>(THEMES[0]);
  const [activeTab, setActiveTab] = useState<NavTab>('island');

  const [media, setMedia] = useState<MediaState>(INITIAL_MEDIA);
  const [volume, setVolume] = useState(68);
  const [brightness, setBrightness] = useState(85);
  const [isMuted, setIsMuted] = useState(false);

  const [promptText, setPromptText] = useState('');
  const [speechLang, setSpeechLang] = useState<'id-ID' | 'en-US'>('id-ID');
  const [isListening, setIsListening] = useState(false);

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

  // Sync dynamic accent CSS vars
  useEffect(() => {
    document.documentElement.style.setProperty('--nx-accent', activeTheme.hex);
    document.documentElement.style.setProperty('--nx-accent-rgb', activeTheme.rgb);
  }, [activeTheme]);

  // Smooth local playback timer when Playing is toggled active
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

  // Automatically clear uploadingFiles spinner when fetch_file row completes
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
          const mediaPatch = extractMediaUpdateFromResult(row.result_text);
          if (mediaPatch) {
            setMedia((prev) => ({
              ...prev,
              ...Object.fromEntries(
                Object.entries(mediaPatch).filter(([, v]) => v !== undefined)
              )
            }));
            break;
          }
        }
      }
    },
    [deviceId]
  );

  // Sync credentials on mount + connect Supabase Realtime + 3s poll fallback
  useEffect(() => {
    const creds = getStoredCredentials();
    setSettingsUrl(creds.url);
    setSettingsKey(creds.anonKey);
    setDeviceId(creds.deviceId || 'windows');

    void syncWidgetCredentials({
      supabaseUrl: creds.url,
      supabaseAnonKey: creds.anonKey,
      deviceId: creds.deviceId || 'windows',
      deviceName: creds.deviceId || 'windows',
      userId: 'default_user'
    });

    if (!supabase) {
      setIslandState('unconfigured');
      setIslandDetail('Pair Device Needed');
      return;
    }

    setIslandState('connected');
    setIslandDetail('Desktop Linked');
    void fetchRecentCommands(supabase);

    const channel = supabase
      .channel('notchx-mobile-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notchx_commands' },
        (payload) => {
          const row = payload.new as NotchXCommandRow | undefined;
          if (!row || row.target_device !== (creds.deviceId || 'windows')) return;

          setCommands((prev) => {
            const exists = prev.some((item) => String(item.id) === String(row.id));
            if (exists) {
              return prev.map((item) =>
                String(item.id) === String(row.id) ? { ...item, ...row } : item
              );
            }
            return [row, ...prev];
          });

          const mediaPatch = extractMediaUpdateFromResult(row.result_text);
          if (mediaPatch) {
            setMedia((prev) => ({
              ...prev,
              ...Object.fromEntries(
                Object.entries(mediaPatch).filter(([, v]) => v !== undefined)
              )
            }));
          }

          if (row.status === 'executed' || row.status === 'completed') {
            triggerHaptic(20);
            setIslandState('done');
            setIslandDetail('Synced');
            window.setTimeout(() => {
              setIslandState('connected');
              setIslandDetail('Desktop Linked');
            }, 2400);
          } else if (row.status === 'error') {
            setIslandState('connected');
            setIslandDetail('Command Error');
          }
        }
      )
      .subscribe();

    const pollInterval = window.setInterval(() => {
      void fetchRecentCommands(supabase);
    }, 3000);

    return () => {
      window.clearInterval(pollInterval);
      void supabase.removeChannel(channel);
    };
  }, [supabase, fetchRecentCommands]);

  const dispatchRemoteCommand = useCallback(
    async (commandType: string, payloadInput: unknown, labelPreview?: string) => {
      triggerHaptic(14);
      if (!supabase) {
        setShowPairingModal(true);
        return null;
      }

      const targetDevice = (deviceId || 'windows').trim();
      setIslandState('executing');
      setIslandDetail(labelPreview || 'Sending...');

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
        setIslandDetail('Send Failed');
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

  const handleFetchFileFromLaptop = async (file: FileSuggestion) => {
    if (!file?.fullPath || uploadingFiles[file.fullPath]) return;
    triggerHaptic(18);
    setUploadingFiles((prev) => ({ ...prev, [file.fullPath]: true }));

    const inserted = await dispatchRemoteCommand(
      'fetch_file',
      {
        file_path: file.fullPath,
        file_name: file.fileName
      },
      `Uploading ${file.fileName}...`
    );

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
    await dispatchRemoteCommand('gemini_prompt', clean, 'Executing AI...');
  };

  const handleThemeSync = async (themeObj: ThemeOption) => {
    triggerHaptic(14);
    setActiveTheme(themeObj);
    setIslandExpanded(false);
    await dispatchRemoteCommand('theme_sync', themeObj.id, `Theme → ${themeObj.label}`);
  };

  const toggleVoiceRecognition = useCallback(() => {
    triggerHaptic(18);
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Browser ini belum mendukung Web Speech API. Gunakan Chrome/Edge/Android WebView.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = speechLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setIslandState('executing');
      setIslandDetail(speechLang === 'id-ID' ? 'Listening (ID)...' : 'Listening (EN)...');
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
      if (transcript) {
        setPromptText(transcript);
        void dispatchRemoteCommand('gemini_prompt', transcript, 'Voice Command...');
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setIslandState('connected');
      setIslandDetail('Desktop Linked');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, speechLang, dispatchRemoteCommand]);

  // Register Android Widget Deep Links (notchx://voice & notchx://files)
  useEffect(() => {
    return registerWidgetDeepLinks({
      onVoiceTrigger: () => {
        window.setTimeout(() => {
          toggleVoiceRecognition();
        }, 250);
      },
      onFileSearchTrigger: () => {
        setActiveTab('island');
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
    <div className="min-h-screen bg-[#09090B] text-[#E5E1E4] flex flex-col select-none antialiased">
      {/* Subtle Ambient Gold Radial Bloom */}
      <div
        className="pointer-events-none fixed top-[-90px] left-1/2 -translate-x-1/2 w-80 h-44 rounded-full blur-[90px] opacity-15 transition-colors duration-500 z-0"
        style={{ backgroundColor: activeTheme.hex }}
      />

      {/* TOP FIXED HEADER (Stitch Obsidian Cockpit Header) */}
      <header className="fixed top-0 inset-x-0 z-40 pt-safe bg-[#09090B]/85 backdrop-blur-xl border-b border-[#27272A]/70">
        <div className="h-16 px-4 flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Living NotchX Brand Mark */}
            <div className="w-9 h-9 rounded-xl bg-[#121215] border border-[#27272A] flex items-center justify-center gap-1 shrink-0 shadow-inner">
              <span
                className="nx-eye w-1.5 h-2 rounded-full inline-block"
                style={{ backgroundColor: activeTheme.hex }}
              />
              <span
                className="nx-eye w-1.5 h-2 rounded-full inline-block"
                style={{ backgroundColor: activeTheme.hex }}
              />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[17px] font-bold tracking-tight text-[#E5E1E4] truncate">
                  NotchX
                </span>
                <span className="font-mono text-[10px] font-semibold tracking-wider text-[#99907D] uppercase">
                  Remote
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    islandState === 'executing'
                      ? 'bg-[#E5C158] animate-ping'
                      : islandState === 'unconfigured'
                      ? 'bg-rose-400'
                      : 'bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse'
                  }`}
                />
                <span
                  className={`font-mono text-[10px] font-semibold tracking-widest uppercase ${
                    islandState === 'executing'
                      ? 'text-[#FFDE82]'
                      : islandState === 'unconfigured'
                      ? 'text-rose-400'
                      : 'text-[#4EDEA3]'
                  }`}
                >
                  {islandState === 'executing'
                    ? islandDetail
                    : islandState === 'unconfigured'
                    ? 'DESKTOP UNPAIRED'
                    : 'DESKTOP ONLINE'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setShowPairingModal(true);
              }}
              aria-label="Desktop Pairing"
              className="h-10 px-3 rounded-xl bg-[#121215] hover:bg-[#201F22] border border-[#27272A] text-[#E5E1E4] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Link2 className="w-4 h-4" style={{ color: activeTheme.hex }} />
              <span className="font-mono text-[10px] font-semibold uppercase text-[#D0C5B1]">
                Pair
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setIslandExpanded((v) => !v);
              }}
              aria-label="Theme Sync"
              className="w-10 h-10 rounded-xl bg-[#121215] hover:bg-[#201F22] border border-[#27272A] flex items-center justify-center active:scale-95 transition-all"
            >
              <Palette className="w-4 h-4" style={{ color: activeTheme.hex }} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN COCKPIT CONTAINER */}
      <main className="relative z-10 flex flex-col w-full max-w-md mx-auto pt-20 pb-40 px-4 gap-3.5">
        {/* Realtime Dynamic Island Mirror Pill */}
        <section className="w-full bg-[#0E0E10] border border-[#27272A] rounded-[24px] p-2.5 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 pl-1.5 min-w-0">
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isDesktopOnline
                    ? 'bg-[#4EDEA3] shadow-[0_0_8px_rgba(78,222,163,0.6)] animate-pulse'
                    : 'bg-rose-400'
                }`}
              />
              <span className="font-mono text-[10px] font-semibold tracking-wider text-[#4EDEA3] uppercase truncate">
                LIVE DESKTOP NOTCH
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#201F22] border border-[#27272A] max-w-[165px]">
              <AudioWaveform className="w-3.5 h-3.5 shrink-0" style={{ color: activeTheme.hex }} />
              <span className="font-mono text-[11px] text-[#E5E1E4] truncate">
                {media.isPlaying ? `Playing: ${media.title}` : islandDetail}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setIslandExpanded((v) => !v);
              }}
              aria-label="Toggle Mirror Details"
              className="w-7 h-7 rounded-full bg-[#2A2A2C] flex items-center justify-center text-[#D0C5B1] active:scale-95 transition-transform shrink-0"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {islandExpanded && (
            <div className="mt-2.5 pt-2.5 border-t border-[#27272A] flex flex-col gap-2 px-1">
              <div className="flex items-center justify-between font-mono text-[10px] text-[#99907D]">
                <span>LIVE WINDOWS THEME · TARGET: {deviceId}</span>
                <span style={{ color: activeTheme.hex }}>{activeTheme.id}</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {THEMES.map((t) => {
                  const selected = t.id === activeTheme.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => void handleThemeSync(t)}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all active:scale-95 ${
                        selected
                          ? 'bg-[#201F22] border-[#E5C158]/50'
                          : 'bg-[#121215] border-[#27272A] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{
                          backgroundColor: t.hex,
                          boxShadow: selected ? `0 0 12px ${t.hex}` : 'none'
                        }}
                      />
                      <span className="text-[10px] font-medium text-[#D0C5B1] truncate w-full text-center">
                        {t.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* TAB: ISLAND (Main Stitch Cockpit View) & AUDIO */}
        {(activeTab === 'island' || activeTab === 'audio') && (
          <>
            <MediaPlayerCard
              media={media}
              accentHex={activeTheme.hex}
              onPlayPause={() => {
                setMedia((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
                void dispatchRemoteCommand('media_control', 'play_pause', 'Play / Pause');
              }}
              onPrev={() => {
                void dispatchRemoteCommand('media_control', 'previous', 'Previous Track');
              }}
              onNext={() => {
                void dispatchRemoteCommand('media_control', 'next', 'Next Track');
              }}
              onToggleShuffle={() => {
                triggerHaptic(10);
                setMedia((prev) => ({ ...prev, shuffle: !prev.shuffle }));
              }}
              onToggleRepeat={() => {
                triggerHaptic(10);
                setMedia((prev) => ({ ...prev, repeat: !prev.repeat }));
              }}
              onSeek={(pct) => {
                setMedia((prev) => ({
                  ...prev,
                  progress: pct,
                  elapsedSec: Math.round((pct / 100) * prev.durationSec)
                }));
              }}
            />

            <TelemetrySliders
              volume={volume}
              brightness={brightness}
              isMuted={isMuted}
              accentHex={activeTheme.hex}
              onVolumeChange={(v) => {
                setIsMuted(false);
                setVolume(v);
              }}
              onVolumeCommit={(v) => {
                void dispatchRemoteCommand(
                  'gemini_prompt',
                  `Set my Windows laptop master volume to ${v}% using control_media_and_audio set_volume`,
                  `Volume ${v}%`
                );
              }}
              onBrightnessChange={(v) => setBrightness(v)}
              onBrightnessCommit={(v) => {
                void dispatchRemoteCommand(
                  'gemini_prompt',
                  `Set my Windows display brightness to ${v}% using control_system brightness`,
                  `Brightness ${v}%`
                );
              }}
            />
          </>
        )}

        {/* TAB: ISLAND & ACTIONS -> Quick PC Actions Matrix */}
        {(activeTab === 'island' || activeTab === 'actions') && (
          <QuickActionsGrid
            isMuted={isMuted}
            isListening={isListening}
            miniPillActive={miniPillActive}
            isConnected={isDesktopOnline}
            accentHex={activeTheme.hex}
            showExtended={activeTab === 'actions'}
            onMuteToggle={() => {
              setIsMuted((m) => !m);
              void dispatchRemoteCommand('media_control', 'mute', 'Toggle Audio Mute');
            }}
            onLockRequest={() => {
              triggerHaptic(14);
              setShowLockConfirm(true);
            }}
            onFindFile={() => {
              triggerHaptic(12);
              setPromptText('Cari file ');
              promptInputRef.current?.focus();
            }}
            onScreenshot={() => {
              void dispatchRemoteCommand(
                'gemini_prompt',
                'Analyze my current laptop screen and summarize what is visible right now',
                'Screen Scan...'
              );
            }}
            onMicToggle={toggleVoiceRecognition}
            onNotchMiniPill={() => {
              setMiniPillActive((v) => !v);
              void dispatchRemoteCommand(
                'gemini_prompt',
                'Show a NotchX Remote Mini-Pill alert banner saying "Synced from Phone"',
                'Notch Morph'
              );
            }}
            onPromptAction={(prompt, label) => {
              void dispatchRemoteCommand('gemini_prompt', prompt, label);
            }}
            onOpenClipboard={() => {
              triggerHaptic(10);
              setShowClipboardModal(true);
            }}
          />
        )}

        {/* TAB: STATS / TELEMETRY & LIVE RESULTS FEED */}
        {(activeTab === 'island' || activeTab === 'stats') && (
          <CommandFeed
            commands={commands}
            copiedId={copiedId}
            uploadingFiles={uploadingFiles}
            maxItems={activeTab === 'island' ? 5 : 20}
            onRefresh={() => {
              triggerHaptic(8);
              void fetchRecentCommands(supabase);
            }}
            onCopyResult={(id, text) => void handleCopyResult(id, text)}
            onFetchFile={(file) => void handleFetchFileFromLaptop(file)}
          />
        )}
      </main>

      {/* BOTTOM QUICK-COMMAND INPUT DOCK */}
      <div className="fixed bottom-[76px] inset-x-0 px-4 z-40 flex justify-center pointer-events-none pb-safe">
        <form
          onSubmit={(e) => void handleSendPrompt(e)}
          className="w-full max-w-md bg-[#121215]/95 backdrop-blur-xl border border-[#27272A] rounded-full p-1.5 pl-3 flex items-center gap-1.5 shadow-2xl pointer-events-auto"
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setSpeechLang((l) => (l === 'id-ID' ? 'en-US' : 'id-ID'));
            }}
            className="px-2 py-1 rounded-full bg-[#201F22] border border-[#27272A] font-mono text-[10px] font-semibold text-[#D0C5B1] shrink-0 active:scale-95"
            title="Switch Voice Language"
          >
            {speechLang === 'id-ID' ? 'ID' : 'EN'}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setShowClipboardModal(true);
            }}
            className="p-1.5 rounded-full text-[#99907D] hover:text-[#E5E1E4] shrink-0"
            title="Push Clipboard"
          >
            <Clipboard className="w-4 h-4" />
          </button>

          <input
            ref={promptInputRef}
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Send note or AI command to NotchX..."
            className="flex-1 bg-transparent text-xs text-[#E5E1E4] placeholder:text-[#99907D] focus:outline-none px-1 min-w-0"
          />

          <button
            type="button"
            onClick={toggleVoiceRecognition}
            aria-label="Voice Command"
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all shrink-0 active:scale-95 ${
              isListening
                ? 'bg-rose-500/25 border-rose-400 text-rose-300 animate-pulse shadow-[0_0_16px_rgba(244,63,94,0.5)]'
                : 'bg-[#201F22] border-[#27272A] text-[#D0C5B1] hover:text-[#E5E1E4]'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="submit"
            aria-label="Send Command"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#09090B] font-bold shrink-0 active:scale-90 transition-transform"
            style={{
              backgroundColor: activeTheme.hex,
              boxShadow: `0 0 14px rgba(${activeTheme.rgb}, 0.4)`
            }}
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>

      {/* BOTTOM NAVIGATION BAR (Stitch 4-Tab Nav) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 pb-safe bg-[#09090B]/92 backdrop-blur-xl border-t border-[#27272A]/80">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
          {(
            [
              { id: 'island', label: 'Island', Icon: Smartphone },
              { id: 'audio', label: 'Audio', Icon: AudioWaveform },
              { id: 'stats', label: 'PC Stats', Icon: Cpu },
              { id: 'actions', label: 'Actions', Icon: LayoutGrid }
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
                className={`flex flex-col items-center justify-center gap-1 min-w-[60px] min-h-[44px] transition-colors ${
                  active ? 'font-semibold' : 'text-[#99907D] hover:text-[#E5E1E4]'
                }`}
                style={active ? { color: activeTheme.hex } : undefined}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="font-mono text-[9px] uppercase tracking-wider">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* MODALS */}
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

      <ClipboardModal
        open={showClipboardModal}
        value={clipboardInput}
        accentHex={activeTheme.hex}
        onChange={setClipboardInput}
        onPull={() => {
          setShowClipboardModal(false);
          void dispatchRemoteCommand(
            'gemini_prompt',
            'Read my current Windows clipboard text using clipboard_sync get and show it to me',
            'Reading PC Clipboard...'
          );
        }}
        onPush={() => {
          const text = clipboardInput.trim();
          if (!text) return;
          setClipboardInput('');
          setShowClipboardModal(false);
          void dispatchRemoteCommand(
            'gemini_prompt',
            `Copy this exact text to my Windows clipboard using clipboard_sync set: ${text}`,
            'Syncing Clipboard...'
          );
        }}
        onClose={() => setShowClipboardModal(false)}
      />

      <LockConfirmModal
        open={showLockConfirm}
        onCancel={() => setShowLockConfirm(false)}
        onConfirm={() => {
          setShowLockConfirm(false);
          void dispatchRemoteCommand('system_action', 'lock', 'Locking PC...');
        }}
      />
    </div>
  );
}
