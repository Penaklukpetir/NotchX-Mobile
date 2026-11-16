import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import {
  Gamepad2,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  FileCode,
  File,
  FolderSearch,
  Eye,
  Play,
  VolumeX,
  Clipboard,
  Lock,
  Mic,
  MicOff,
  Send,
  Copy,
  Check,
  Settings,
  Sparkles,
  Palette,
  RefreshCw,
  X,
  ShieldAlert,
  Download,
  ArrowUpRight,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import {
  createNotchXSupabaseClient,
  getStoredCredentials,
  saveStoredCredentials
} from './lib/supabase';

const THEMES = [
  { id: 'ObsidianGold', label: 'Obsidian Gold', hex: '#E5C158', rgb: '229, 193, 88' },
  { id: 'MidnightSapphire', label: 'Midnight Sapphire', hex: '#38BDF8', rgb: '56, 189, 248' },
  { id: 'EmeraldVelvet', label: 'Emerald Velvet', hex: '#34D399', rgb: '52, 211, 153' },
  { id: 'CrimsonNeon', label: 'Crimson Neon', hex: '#FB7185', rgb: '251, 113, 133' },
  { id: 'FrostedPearl', label: 'Frosted Pearl', hex: '#E4E4E7', rgb: '228, 228, 231' }
];

const QUICK_ACTIONS = [
  {
    id: 'roblox',
    title: 'Open Roblox',
    subtitle: 'Launch Player',
    icon: Gamepad2,
    prompt: 'Open Roblox on my laptop'
  },
  {
    id: 'word',
    title: 'Open Word',
    subtitle: 'MS Office',
    icon: FileText,
    prompt: 'Open Microsoft Word on my laptop'
  },
  {
    id: 'recent_docs',
    title: 'Recent Docs',
    subtitle: 'Top 5 modified',
    icon: FolderSearch,
    prompt: 'Search my recent documents and list the 5 most recently modified files'
  },
  {
    id: 'analyze_screen',
    title: 'Analyze Screen',
    subtitle: 'Gemini Vision',
    icon: Eye,
    prompt: 'Analyze my current laptop screen and summarize what is visible right now'
  },
  {
    id: 'play_pause',
    title: 'Play / Pause',
    subtitle: 'Media toggle',
    icon: Play,
    prompt: 'Toggle play or pause media on my laptop'
  },
  {
    id: 'mute',
    title: 'Mute Laptop',
    subtitle: 'Audio silence',
    icon: VolumeX,
    prompt: 'Mute or unmute the audio on my laptop'
  },
  {
    id: 'clipboard',
    title: 'Sync Clipboard',
    subtitle: 'Phone ⇄ PC',
    icon: Clipboard,
    modal: 'clipboard'
  },
  {
    id: 'lock',
    title: 'Lock Laptop',
    subtitle: '2-step confirm',
    icon: Lock,
    modal: 'lock'
  }
];

function triggerHaptic(ms = 12) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(ms);
    } catch {
      // Ignore on unsupported devices
    }
  }
}

function formatPayloadText(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === 'object') {
        return (
          parsed.prompt ||
          parsed.theme ||
          parsed.file_name ||
          parsed.file_path ||
          parsed.text ||
          payload
        );
      }
    } catch {
      // Plain string payload
    }
    return payload;
  }
  if (typeof payload === 'object') {
    if (payload.file_name) return `Kirim File: ${payload.file_name}`;
    return (
      payload.prompt ||
      payload.theme ||
      payload.file_path ||
      payload.text ||
      JSON.stringify(payload)
    );
  }
  return String(payload);
}

function extractJsonObjectAfterMarker(text, marker) {
  const idx = text.indexOf(marker);
  const slice = idx >= 0 ? text.slice(idx + marker.length) : text;
  const firstBrace = slice.indexOf('{');
  const lastBrace = slice.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
  try {
    return JSON.parse(slice.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function parseStructuredResult(resultText) {
  if (!resultText || typeof resultText !== 'string') return null;

  // Case A: __NOTCHX_FILE_SUGGESTIONS__
  if (resultText.includes('__NOTCHX_FILE_SUGGESTIONS__')) {
    const data = extractJsonObjectAfterMarker(resultText, '__NOTCHX_FILE_SUGGESTIONS__');
    if (data) {
      const rawFiles = Array.isArray(data.files)
        ? data.files
        : Array.isArray(data.results)
        ? data.results
        : [];
      const files = rawFiles.map((f) => ({
        fileName: f.fileName || f.file_name || f.name || 'Document',
        fullPath: f.fullPath || f.full_path || f.path || '',
        sizeFormatted: f.sizeFormatted || f.size_formatted || f.size || '',
        lastModified: f.lastModified || f.last_modified || f.modified || ''
      }));
      return {
        kind: 'file_suggestions',
        query: data.query || 'recent',
        files
      };
    }
  }

  // Case B: __NOTCHX_FILE_READY__
  if (resultText.includes('__NOTCHX_FILE_READY__')) {
    const data = extractJsonObjectAfterMarker(resultText, '__NOTCHX_FILE_READY__');
    if (data) {
      return {
        kind: 'file_ready',
        fileName: data.fileName || data.file_name || 'Document',
        sizeFormatted: data.sizeFormatted || data.size_formatted || data.size || '',
        downloadUrl: data.downloadUrl || data.download_url || data.url || ''
      };
    }
  }

  return null;
}

function getFileVisualMeta(fileName = '') {
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
  if (['json', 'js', 'ts', 'py', 'cs', 'html', 'css'].includes(ext)) {
    return { Icon: FileCode, badge: ext.toUpperCase(), color: '#E5C158' };
  }
  return { Icon: File, badge: (ext || 'FILE').toUpperCase().slice(0, 4), color: '#E5C158' };
}

export default function App() {
  const [supabase, setSupabase] = useState(() => createNotchXSupabaseClient());
  const [islandState, setIslandState] = useState('connected'); // 'connected' | 'executing' | 'done' | 'unconfigured'
  const [islandDetail, setIslandDetail] = useState('Laptop Connected');
  const [islandExpanded, setIslandExpanded] = useState(false);
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);

  const [promptText, setPromptText] = useState('');
  const [speechLang, setSpeechLang] = useState('id-ID');
  const [isListening, setIsListening] = useState(false);

  const [commands, setCommands] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState({}); // { [fullPath]: commandId | true }

  const [showClipboardModal, setShowClipboardModal] = useState(false);
  const [clipboardInput, setClipboardInput] = useState('');
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [settingsUrl, setSettingsUrl] = useState('');
  const [settingsKey, setSettingsKey] = useState('');

  const gridRef = useRef(null);
  const recognitionRef = useRef(null);

  // Apply dynamic theme CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--nx-accent', activeTheme.hex);
    document.documentElement.style.setProperty('--nx-accent-rgb', activeTheme.rgb);
  }, [activeTheme]);

  // Antigravity staggered 3D card entrance
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !gridRef.current) return;

    const cards = gridRef.current.querySelectorAll('.nx-action-chip');
    gsap.fromTo(
      cards,
      { opacity: 0, y: 22, rotateX: 18, scale: 0.94 },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        scale: 1,
        duration: 0.48,
        stagger: 0.055,
        ease: 'power3.out',
        clearProps: 'transform'
      }
    );
  }, []);

  // Automatically clear uploadingFiles spinner when corresponding fetch_file row completes
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
                      return JSON.parse(c.payload);
                    } catch {
                      return null;
                    }
                  })()
                : c.payload;
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

  const fetchRecentCommands = useCallback(async (client) => {
    if (!client) return;
    const { data, error } = await client
      .from('notchx_commands')
      .select('*')
      .eq('target_device', 'windows')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && Array.isArray(data)) {
      setCommands(data);
    }
  }, []);

  // Connect Supabase Realtime + fallback poll for pending commands
  useEffect(() => {
    const creds = getStoredCredentials();
    setSettingsUrl(creds.url);
    setSettingsKey(creds.anonKey);

    if (!supabase) {
      setIslandState('unconfigured');
      setIslandDetail('Tap Gear to Set Key');
      return;
    }

    setIslandState('connected');
    setIslandDetail('Laptop Connected');
    fetchRecentCommands(supabase);

    const channel = supabase
      .channel('notchx-mobile-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notchx_commands' },
        (payload) => {
          const row = payload.new;
          if (!row || row.target_device !== 'windows') return;

          setCommands((prev) => {
            const exists = prev.some((item) => String(item.id) === String(row.id));
            if (exists) {
              return prev.map((item) =>
                String(item.id) === String(row.id) ? { ...item, ...row } : item
              );
            }
            return [row, ...prev];
          });

          if (row.status === 'executed' || row.status === 'completed') {
            triggerHaptic(20);
            setIslandState('done');
            setIslandDetail('Result Received');
            setTimeout(() => {
              setIslandState('connected');
              setIslandDetail('Laptop Connected');
            }, 2600);
          } else if (row.status === 'error') {
            setIslandState('connected');
            setIslandDetail('Execution Error');
          }
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      fetchRecentCommands(supabase);
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchRecentCommands]);

  const dispatchRemoteCommand = async (commandType, payloadText, labelPreview) => {
    triggerHaptic(15);
    if (!supabase) {
      setShowSettingsModal(true);
      return null;
    }

    setIslandState('executing');
    setIslandDetail(labelPreview || 'Executing on Laptop...');

    const structuredPayload =
      typeof payloadText === 'object' && payloadText !== null
        ? payloadText
        : commandType === 'theme_sync'
        ? { theme: payloadText }
        : { prompt: payloadText };

    const optimisticId = `temp-${Date.now()}`;
    const optimisticRow = {
      id: optimisticId,
      source_device: 'android',
      target_device: 'windows',
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
          target_device: 'windows',
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
      setCommands((prev) =>
        prev.map((c) => (c.id === optimisticId ? data : c))
      );
      return data;
    }
    return null;
  };

  const handleFetchFileFromLaptop = async (file) => {
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

  const handleSendPrompt = async (e) => {
    if (e) e.preventDefault();
    const clean = promptText.trim();
    if (!clean) return;
    setPromptText('');
    await dispatchRemoteCommand('gemini_prompt', clean, 'Executing...');
  };

  const handleThemeSync = async (themeObj) => {
    triggerHaptic(14);
    setActiveTheme(themeObj);
    setIslandExpanded(false);
    await dispatchRemoteCommand('theme_sync', themeObj.id, `Theme → ${themeObj.label}`);
  };

  const handleQuickAction = (item) => {
    triggerHaptic(14);
    if (item.modal === 'clipboard') {
      setShowClipboardModal(true);
      return;
    }
    if (item.modal === 'lock') {
      setShowLockConfirm(true);
      return;
    }
    dispatchRemoteCommand('gemini_prompt', item.prompt, item.title);
  };

  const toggleVoiceRecognition = () => {
    triggerHaptic(18);
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Browser ini belum mendukung Web Speech API. Gunakan Chrome/Edge/Safari di HP.');
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
      setIslandDetail(speechLang === 'id-ID' ? 'Mendengarkan (ID)...' : 'Listening (EN)...');
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
      if (transcript) {
        setPromptText(transcript);
        dispatchRemoteCommand('gemini_prompt', transcript, 'Voice Command...');
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setIslandState('connected');
      setIslandDetail('Laptop Connected');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleCopyResult = async (id, text) => {
    if (!text) return;
    triggerHaptic(10);
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    saveStoredCredentials(settingsUrl, settingsKey);
    const nextClient = createNotchXSupabaseClient();
    setSupabase(nextClient);
    setShowSettingsModal(false);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col items-center pb-32 px-4 select-none nx-perspective-stage">
      {/* Ambient Radial Luxury Glow */}
      <div
        className="pointer-events-none fixed top-[-120px] left-1/2 -translate-x-1/2 w-[360px] h-[220px] rounded-full blur-[90px] opacity-25 transition-colors duration-500"
        style={{ backgroundColor: activeTheme.hex }}
      />

      {/* DYNAMIC ISLAND TOP PILL */}
      <header className="sticky top-3 z-40 w-full max-w-md flex flex-col items-center">
        <div
          onClick={() => {
            triggerHaptic(8);
            setIslandExpanded((v) => !v);
          }}
          className="nx-glass-pill w-full rounded-[26px] px-4 py-3 cursor-pointer transition-all duration-300"
        >
          <div className="flex items-center justify-between gap-2">
            {/* Living NotchX Eyes + Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-black/70 border border-white/10 px-2.5 py-1.5 rounded-full">
                <span
                  className="nx-eye w-2 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: activeTheme.hex }}
                />
                <span
                  className="nx-eye w-2 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: activeTheme.hex }}
                />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      islandState === 'executing'
                        ? 'bg-amber-400 animate-ping'
                        : islandState === 'done'
                        ? 'bg-emerald-400'
                        : islandState === 'unconfigured'
                        ? 'bg-rose-400'
                        : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                  <span className="text-xs font-semibold tracking-wide text-zinc-100">
                    {islandState === 'executing'
                      ? 'Executing...'
                      : islandState === 'done'
                      ? 'Done'
                      : islandState === 'unconfigured'
                      ? 'Setup Key'
                      : 'Laptop Connected'}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 truncate max-w-[175px]">
                  {islandDetail}
                </span>
              </div>
            </div>

            {/* Right Controls: Theme Pill & Settings Gear */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(10);
                  setIslandExpanded((v) => !v);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-medium text-zinc-300"
                title="Sync NotchX Theme"
              >
                <Palette className="w-3.5 h-3.5" style={{ color: activeTheme.hex }} />
                <span className="hidden xs:inline">{activeTheme.label.split(' ')[0]}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic(10);
                  setShowSettingsModal(true);
                }}
                className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300"
                title="Supabase Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Expandable Theme Sync Switcher inside Dynamic Island */}
          {islandExpanded && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-3 pt-3 border-t border-white/[0.08] flex flex-col gap-2"
            >
              <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                <span>LIVE WINDOWS THEME SYNC</span>
                <span className="font-mono text-[10px]" style={{ color: activeTheme.hex }}>
                  {activeTheme.id}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {THEMES.map((t) => {
                  const selected = t.id === activeTheme.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleThemeSync(t)}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all ${
                        selected
                          ? 'bg-white/[0.09] border-white/30 scale-[1.02]'
                          : 'bg-white/[0.02] border-white/[0.06] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shadow-inner"
                        style={{
                          backgroundColor: t.hex,
                          boxShadow: selected ? `0 0 12px ${t.hex}` : 'none'
                        }}
                      />
                      <span className="text-[10px] font-medium text-zinc-300 truncate w-full text-center">
                        {t.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="w-full max-w-md mt-5 flex flex-col gap-6">
        {/* 8 QUICK ACTION CHIPS */}
        <section>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: activeTheme.hex }} />
              Instant OS Triggers
            </h2>
            <span className="text-[11px] text-zinc-500">1-Tap Remote</span>
          </div>

          <div ref={gridRef} className="grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleQuickAction(item)}
                  className="nx-action-chip nx-spatial-card rounded-2xl p-3.5 text-left flex items-center gap-3 group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: `rgba(${activeTheme.rgb}, 0.12)`,
                      color: activeTheme.hex
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-semibold text-zinc-100 truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* LIVE COMMAND FEED & RESULT CARDS */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Live Telemetry & Results
            </h2>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                fetchRecentCommands(supabase);
              }}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>

          {commands.length === 0 ? (
            <div className="nx-spatial-card rounded-2xl p-6 text-center text-zinc-400 text-xs">
              Belum ada perintah remote. Tap salah satu tombol di atas atau bicara lewat mikrofon di bawah.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {commands.map((cmd) => {
                const isPending = cmd.status === 'pending';
                const isError = cmd.status === 'error';
                const structured = !isPending ? parseStructuredResult(cmd.result_text) : null;

                return (
                  <article
                    key={cmd.id}
                    className="nx-spatial-card rounded-2xl p-4 flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                            isPending
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                              : isError
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {cmd.status || 'pending'}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {cmd.command_type}
                        </span>
                      </div>

                      {cmd.result_text && !structured && (
                        <button
                          type="button"
                          onClick={() => handleCopyResult(cmd.id, cmd.result_text)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[11px] text-zinc-300"
                        >
                          {copiedId === cmd.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="text-xs font-medium text-zinc-100">
                      “{formatPayloadText(cmd.payload)}”
                    </div>

                    {isPending ? (
                      <div className="text-[11px] text-amber-300/90 flex items-center gap-2 pt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        {cmd.command_type === 'fetch_file'
                          ? 'Mengunggah file dari laptop ke cloud...'
                          : 'Menunggu eksekusi dari NotchX.exe di laptop...'}
                      </div>
                    ) : structured?.kind === 'file_suggestions' ? (
                      /* CASE A: __NOTCHX_FILE_SUGGESTIONS__ INTERACTIVE CARDS */
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-0.5">
                          <span>
                            Ditemukan <strong className="text-zinc-200">{structured.files.length}</strong> file
                            {structured.query ? ` (${structured.query})` : ''}
                          </span>
                          <span className="text-[10px] text-[#E5C158]">Tap untuk kirim ke HP</span>
                        </div>

                        {structured.files.length === 0 ? (
                          <div className="text-xs text-zinc-400 bg-black/40 border border-white/[0.06] rounded-xl p-3">
                            Tidak ada file yang cocok ditemukan di laptop.
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {structured.files.map((file, idx) => {
                              const { Icon: FileIcon, badge, color } = getFileVisualMeta(file.fileName);
                              const isUploading = Boolean(uploadingFiles[file.fullPath]);

                              return (
                                <button
                                  key={`${file.fullPath}-${idx}`}
                                  type="button"
                                  disabled={isUploading}
                                  onClick={() => handleFetchFileFromLaptop(file)}
                                  className="w-full text-left rounded-xl p-3 bg-[#09090B]/90 hover:bg-white/[0.04] border border-[#E5C158]/25 hover:border-[#E5C158]/60 transition-all flex items-center justify-between gap-3 group active:scale-[0.985]"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border border-white/10"
                                      style={{
                                        backgroundColor: `${color}18`,
                                        color
                                      }}
                                    >
                                      <FileIcon className="w-4 h-4" />
                                      <span className="text-[8px] font-mono font-bold tracking-tighter mt-0.5">
                                        {badge}
                                      </span>
                                    </div>

                                    <div className="min-w-0 flex flex-col">
                                      <span className="text-xs font-bold text-zinc-100 truncate">
                                        {file.fileName}
                                      </span>
                                      <span className="text-[11px] text-zinc-400 truncate">
                                        {[file.sizeFormatted, file.lastModified]
                                          .filter(Boolean)
                                          .join(' • ')}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {isUploading ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-[10px] font-semibold text-amber-300">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Mengunggah dari laptop...
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#E5C158]/15 group-hover:bg-[#E5C158]/25 border border-[#E5C158]/40 text-[10px] font-semibold text-[#E5C158]">
                                        Kirim ke HP
                                        <ArrowUpRight className="w-3 h-3" />
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : structured?.kind === 'file_ready' ? (
                      /* CASE B: __NOTCHX_FILE_READY__ CHAMPAGNE GOLD DOWNLOAD CARD */
                      <div
                        className="mt-1 rounded-2xl p-4 border flex flex-col gap-3"
                        style={{
                          background:
                            'linear-gradient(145deg, rgba(229, 193, 88, 0.14) 0%, rgba(9, 9, 11, 0.95) 100%)',
                          borderColor: 'rgba(229, 193, 88, 0.45)',
                          boxShadow: '0 12px 30px rgba(229, 193, 88, 0.12)'
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#E5C158]/20 border border-[#E5C158]/40 flex items-center justify-center text-[#E5C158] shrink-0">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#E5C158]">
                                File Siap Diunduh
                              </div>
                              <div className="text-xs font-bold text-zinc-100 truncate">
                                {structured.fileName}
                              </div>
                              {structured.sizeFormatted && (
                                <div className="text-[11px] text-zinc-400">
                                  Ukuran: {structured.sizeFormatted}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={structured.downloadUrl}
                            download={structured.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => triggerHaptic(16)}
                            className="py-2.5 px-3 rounded-xl bg-[#E5C158] hover:bg-[#eabef0]/90 text-black text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(229,193,88,0.35)] active:scale-95 transition-transform"
                            style={{ backgroundColor: '#E5C158' }}
                          >
                            <Download className="w-4 h-4" />
                            Download File
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopyResult(cmd.id, structured.downloadUrl)}
                            className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                          >
                            {copiedId === cmd.id ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span>Link Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      cmd.result_text && (
                        <pre className="text-xs text-zinc-300 bg-black/50 border border-white/[0.06] rounded-xl p-3 whitespace-pre-wrap font-sans leading-relaxed overflow-x-auto">
                          {cmd.result_text}
                        </pre>
                      )
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* FLOATING VOICE + TEXT COMMAND BAR */}
      <div className="fixed bottom-4 inset-x-0 px-4 z-40 flex justify-center pointer-events-none">
        <form
          onSubmit={handleSendPrompt}
          className="nx-glass-pill w-full max-w-md rounded-full p-1.5 pl-3 flex items-center gap-1.5 pointer-events-auto"
        >
          {/* Language Switcher Pill (id-ID / en-US) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setSpeechLang((l) => (l === 'id-ID' ? 'en-US' : 'id-ID'));
            }}
            className="px-2 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[10px] font-mono font-semibold text-zinc-300 shrink-0"
            title="Switch Voice Recognition Language"
          >
            {speechLang === 'id-ID' ? 'ID' : 'EN'}
          </button>

          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Perintah ke laptop (mis. Buka Roblox)..."
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none px-1.5"
          />

          {/* Glowing Push-to-Talk Microphone Button */}
          <button
            type="button"
            onClick={toggleVoiceRecognition}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all shrink-0 ${
              isListening
                ? 'bg-rose-500/25 border-rose-400 text-rose-300 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.55)]'
                : 'bg-white/[0.05] border-white/10 text-zinc-300 hover:text-white'
            }`}
            title="Voice Command (ID/EN)"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            className="w-9 h-9 rounded-full flex items-center justify-center text-black font-semibold shrink-0 transition-transform active:scale-90"
            style={{
              backgroundColor: activeTheme.hex,
              boxShadow: `0 0 18px rgba(${activeTheme.rgb}, 0.45)`
            }}
            title="Kirim ke Laptop"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* CLIPBOARD SYNC MODAL */}
      {showClipboardModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="nx-glass-pill w-full max-w-sm rounded-3xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clipboard className="w-4 h-4" style={{ color: activeTheme.hex }} />
                Sync Clipboard Laptop
              </h3>
              <button
                type="button"
                onClick={() => setShowClipboardModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={3}
              value={clipboardInput}
              onChange={(e) => setClipboardInput(e.target.value)}
              placeholder="Tempel teks atau link di sini agar langsung siap di-Ctrl+V di laptop..."
              className="w-full rounded-2xl bg-black/60 border border-white/10 p-3 text-xs text-zinc-100 focus:outline-none focus:border-white/30"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowClipboardModal(false);
                  dispatchRemoteCommand(
                    'gemini_prompt',
                    'Read my current Windows clipboard text using clipboard_sync get and show it to me',
                    'Reading PC Clipboard...'
                  );
                }}
                className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-medium text-zinc-200"
              >
                Ambil dari Laptop
              </button>

              <button
                type="button"
                onClick={() => {
                  const text = clipboardInput.trim();
                  if (!text) return;
                  setClipboardInput('');
                  setShowClipboardModal(false);
                  dispatchRemoteCommand(
                    'gemini_prompt',
                    `Copy this exact text to my Windows clipboard using clipboard_sync set: ${text}`,
                    'Syncing Clipboard...'
                  );
                }}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold text-black"
                style={{ backgroundColor: activeTheme.hex }}
              >
                Kirim ke Laptop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-STEP LOCK LAPTOP CONFIRMATION MODAL */}
      {showLockConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="nx-glass-pill w-full max-w-sm rounded-3xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-amber-300">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold">Kunci Layar Laptop Sekarang?</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Laptop Windows Anda akan langsung menjalankan <code className="text-zinc-200">LockWorkStation()</code> dan meminta PIN/Password saat dibuka kembali.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowLockConfirm(false)}
                className="py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-medium text-zinc-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLockConfirm(false);
                  dispatchRemoteCommand(
                    'gemini_prompt',
                    'Lock my Windows laptop workstation immediately using power_management lock',
                    'Locking Laptop...'
                  );
                }}
                className="py-2.5 rounded-xl bg-rose-500 text-white text-xs font-semibold"
              >
                Ya, Kunci Laptop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPABASE SETTINGS MODAL (LOCALSTORAGE FALLBACK) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSettings}
            className="nx-glass-pill w-full max-w-sm rounded-3xl p-5 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4" style={{ color: activeTheme.hex }} />
                Supabase Connection
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400">SUPABASE_URL</label>
              <input
                type="text"
                value={settingsUrl}
                onChange={(e) => setSettingsUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full rounded-xl bg-black/60 border border-white/10 px-3 py-2 text-xs text-zinc-100 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400">
                SUPABASE_ANON_KEY (Publishable / Anon Key)
              </label>
              <input
                type="password"
                value={settingsKey}
                onChange={(e) => setSettingsKey(e.target.value)}
                placeholder="sb_publishable_... atau eyJ..."
                className="w-full rounded-xl bg-black/60 border border-white/10 px-3 py-2 text-xs text-zinc-100 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 rounded-xl text-xs font-semibold text-black mt-1"
              style={{ backgroundColor: activeTheme.hex }}
            >
              Simpan & Hubungkan
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
