import React from 'react';
import {
  VolumeX,
  Volume2,
  Lock,
  FolderSearch,
  MonitorSmartphone,
  Mic,
  MicOff,
  Maximize2,
  Gamepad2,
  FileText,
  Clipboard,
  Eye
} from 'lucide-react';

interface QuickActionsGridProps {
  isMuted: boolean;
  isListening: boolean;
  miniPillActive: boolean;
  isConnected: boolean;
  accentHex: string;
  showExtended?: boolean;
  onMuteToggle: () => void;
  onLockRequest: () => void;
  onFindFile: () => void;
  onScreenshot: () => void;
  onMicToggle: () => void;
  onNotchMiniPill: () => void;
  onPromptAction: (prompt: string, label: string) => void;
  onOpenClipboard: () => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  isMuted,
  isListening,
  miniPillActive,
  isConnected,
  accentHex,
  showExtended = false,
  onMuteToggle,
  onLockRequest,
  onFindFile,
  onScreenshot,
  onMicToggle,
  onNotchMiniPill,
  onPromptAction,
  onOpenClipboard
}) => {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[10px] font-semibold tracking-wider text-[#99907D] uppercase">
          Tactile Remote Matrix
        </span>
        <span
          className={`font-mono text-[10px] font-semibold uppercase ${
            isConnected ? 'text-[#4EDEA3]' : 'text-[#99907D]'
          }`}
        >
          {isConnected ? 'Synced · Live' : 'Standby'}
        </span>
      </div>

      {/* 2x3 Tactile Bento Matrix */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* 1. Mute Audio */}
        <button
          type="button"
          onClick={onMuteToggle}
          className="nx-cockpit-card hover:border-[#3F3F46] active:scale-95 rounded-xl p-3.5 flex items-center gap-3 transition-all text-left relative overflow-hidden"
        >
          <div className="w-9 h-9 rounded-lg bg-[#201F22] border border-[#27272A] flex items-center justify-center flex-shrink-0">
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-[#F87171]" />
            ) : (
              <Volume2 className="w-5 h-5" style={{ color: accentHex }} />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-[#E5E1E4] truncate">Mute Audio</span>
            <span className="font-mono text-[10px] text-[#99907D] uppercase">
              {isMuted ? 'Muted' : 'Toggle'}
            </span>
          </div>
          <div
            className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: isMuted ? '#F87171' : `${accentHex}B3` }}
          />
        </button>

        {/* 2. Lock PC */}
        <button
          type="button"
          onClick={onLockRequest}
          className="nx-cockpit-card hover:border-[#3F3F46] active:scale-95 rounded-xl p-3.5 flex items-center gap-3 transition-all text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-[#201F22] border border-[#27272A] flex items-center justify-center text-[#F87171] flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-[#E5E1E4] truncate">Lock PC</span>
            <span className="font-mono text-[10px] text-[#99907D] uppercase">2-Step Lock</span>
          </div>
        </button>

        {/* 3. Find File */}
        <button
          type="button"
          onClick={onFindFile}
          className="nx-cockpit-card hover:border-[#3F3F46] active:scale-95 rounded-xl p-3.5 flex items-center gap-3 transition-all text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-[#201F22] border border-[#27272A] flex items-center justify-center text-[#D0C5B1] flex-shrink-0">
            <FolderSearch className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-[#E5E1E4] truncate">Find File</span>
            <span className="font-mono text-[10px] text-[#99907D] uppercase">Fast Index</span>
          </div>
        </button>

        {/* 4. Screenshot / Vision */}
        <button
          type="button"
          onClick={onScreenshot}
          className="nx-cockpit-card hover:border-[#3F3F46] active:scale-95 rounded-xl p-3.5 flex items-center gap-3 transition-all text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-[#201F22] border border-[#27272A] flex items-center justify-center text-[#4EDEA3] flex-shrink-0">
            <MonitorSmartphone className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-[#E5E1E4] truncate">Screenshot</span>
            <span className="font-mono text-[10px] text-[#99907D] uppercase">AI Screen</span>
          </div>
        </button>

        {/* 5. Mic Toggle */}
        <button
          type="button"
          onClick={onMicToggle}
          className="nx-cockpit-card hover:border-[#3F3F46] active:scale-95 rounded-xl p-3.5 flex items-center gap-3 transition-all text-left relative overflow-hidden"
        >
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${
              isListening
                ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                : 'bg-[#201F22] border-[#27272A]'
            }`}
            style={isListening ? undefined : { color: accentHex }}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-[#E5E1E4] truncate">Mic Toggle</span>
            <span className="font-mono text-[10px] text-[#99907D] uppercase">
              {isListening ? 'Listening' : 'Voice Cmd'}
            </span>
          </div>
          <div
            className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full ${
              isListening ? 'bg-rose-400 animate-ping' : 'bg-[#4EDEA3]'
            }`}
          />
        </button>

        {/* 6. Notch Mini-Pill */}
        <button
          type="button"
          onClick={onNotchMiniPill}
          className="nx-cockpit-card hover:border-[#3F3F46] active:scale-95 rounded-xl p-3.5 flex items-center gap-3 transition-all text-left relative overflow-hidden"
        >
          <div className="w-9 h-9 rounded-lg bg-[#201F22] border border-[#27272A] flex items-center justify-center text-[#FFE08B] flex-shrink-0">
            <Maximize2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-[#E5E1E4] truncate">Notch Mini-Pill</span>
            <span className="font-mono text-[10px] text-[#99907D] uppercase">
              {miniPillActive ? 'Morphed' : 'Morph Win'}
            </span>
          </div>
          {miniPillActive && (
            <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#E5C158]" />
          )}
        </button>
      </div>

      {/* Extended App & Utility Launchers (Shown in Actions tab or expanded view) */}
      {showExtended && (
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onPromptAction('Open Roblox on my laptop', 'Open Roblox')}
            className="nx-cockpit-card hover:border-[#3F3F46] active:scale-95 rounded-xl p-3.5 flex items-center gap-3 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-[#201F22] border border-[#27272A] flex items-center justify-center text-[#E5C158] flex-shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-[#E5E1E4] truncate">Open Roblox</span>
              <span className="font-mono text-[10px] text-[#99907D] uppercase">Launch App</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onPromptAction('Open Microsoft Word on my laptop', 'Open Word')}
            className="nx-cockpit-card hover:border-[#3F3F46] active:scale-95 rounded-xl p-3.5 flex items-center gap-3 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-[#201F22] border border-[#27272A] flex items-center justify-center text-sky-400 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-[#E5E1E4] truncate">Open Word</span>
              <span className="font-mono text-[10px] text-[#99907D] uppercase">MS Office</span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenClipboard}
            className="nx-cockpit-card hover:border-[#3F3F46] active:scale-95 rounded-xl p-3.5 flex items-center gap-3 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-[#201F22] border border-[#27272A] flex items-center justify-center text-[#E5C158] flex-shrink-0">
              <Clipboard className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-[#E5E1E4] truncate">Sync Clipboard</span>
              <span className="font-mono text-[10px] text-[#99907D] uppercase">Phone ⇄ PC</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              onPromptAction(
                'Analyze my current laptop screen and summarize what is visible right now',
                'Analyze Screen'
              )
            }
            className="nx-cockpit-card hover:border-[#3F3F46] active:scale-95 rounded-xl p-3.5 flex items-center gap-3 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-[#201F22] border border-[#27272A] flex items-center justify-center text-[#4EDEA3] flex-shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-[#E5E1E4] truncate">Vision Scan</span>
              <span className="font-mono text-[10px] text-[#99907D] uppercase">Gemini Eye</span>
            </div>
          </button>
        </div>
      )}
    </section>
  );
};
