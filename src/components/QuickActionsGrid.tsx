import React from 'react';
import {
  Mic,
  MicOff,
  ScanEye,
  Loader2,
  VolumeX,
  Volume2,
  Maximize2,
  FolderSearch,
  Lock
} from 'lucide-react';

interface QuickActionsGridProps {
  isMuted: boolean;
  isMicMuted: boolean;
  isScanningVision: boolean;
  miniPillActive: boolean;
  isConnected: boolean;
  accentHex: string;
  onMicToggle: () => void;
  onVisionScan: () => void;
  onMuteToggle: () => void;
  onNotchMiniPill: () => void;
  onFindFile: () => void;
  onLockRequest: () => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  isMuted,
  isMicMuted,
  isScanningVision,
  miniPillActive,
  isConnected,
  accentHex,
  onMicToggle,
  onVisionScan,
  onMuteToggle,
  onNotchMiniPill,
  onFindFile,
  onLockRequest
}) => {
  return (
    <section className="flex flex-col gap-3 relative z-10">
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[10px] font-semibold tracking-wider text-[#A1A1AA] uppercase">
          PC Hardware Controls
        </span>
        <span
          className={`font-mono text-[10px] font-semibold uppercase ${
            isConnected ? 'text-[#10B981]' : 'text-[#A1A1AA]'
          }`}
        >
          {isConnected ? 'Live · Ready' : 'Standby'}
        </span>
      </div>

      {/* 2x3 Hardware Action Keys */}
      <div className="grid grid-cols-2 gap-3 relative z-10">
        {/* 1. Mic Toggle (Fixed: zero blockers, optimistic gold active state) */}
        <button
          type="button"
          onClick={onMicToggle}
          className={`relative z-10 min-h-[86px] rounded-2xl p-3.5 flex flex-col justify-between text-left transition-all active:scale-95 border ${
            isMicMuted
              ? 'bg-[#E5C158]/15 border-[#E5C158]/60 shadow-[0_0_20px_-4px_rgba(229,193,88,0.28)]'
              : 'bg-[#121215] border-[#27272A] hover:border-[#3F3F46]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                isMicMuted
                  ? 'bg-[#E5C158] text-[#09090B] border-[#E5C158]'
                  : 'bg-[#1C1B1D] border-[#27272A] text-[#10B981]'
              }`}
            >
              {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                isMicMuted ? 'bg-[#E5C158]' : 'bg-[#10B981] animate-pulse'
              }`}
            />
          </div>
          <div className="flex flex-col mt-2">
            <span className="text-sm font-semibold text-[#FAFAFA]">Mic Toggle</span>
            <span
              className={`font-mono text-[10px] font-semibold uppercase ${
                isMicMuted ? 'text-[#E5C158]' : 'text-[#10B981]'
              }`}
            >
              {isMicMuted ? 'MIC MUTED' : 'MIC LIVE'}
            </span>
          </div>
        </button>

        {/* 2. Vision Scan (Prominent Gold Accent) */}
        <button
          type="button"
          onClick={onVisionScan}
          disabled={isScanningVision}
          className={`relative z-10 min-h-[86px] rounded-2xl p-3.5 flex flex-col justify-between text-left transition-all active:scale-95 border ${
            isScanningVision
              ? 'bg-[#E5C158]/20 border-[#E5C158] shadow-[0_0_24px_-4px_rgba(229,193,88,0.4)]'
              : 'bg-[#121215] border-[#E5C158]/40 hover:border-[#E5C158]/80'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#09090B] border border-[#E5C158]/50"
              style={{ backgroundColor: accentHex }}
            >
              {isScanningVision ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ScanEye className="w-5 h-5" />
              )}
            </div>
            <span
              className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#E5C158]/15 text-[#E5C158]`}
            >
              AI EYE
            </span>
          </div>
          <div className="flex flex-col mt-2">
            <span className="text-sm font-semibold text-[#FAFAFA]">Vision Scan</span>
            <span className="font-mono text-[10px] text-[#E5C158] uppercase truncate">
              {isScanningVision ? 'Scanning PC Screen...' : 'Capture & Explain'}
            </span>
          </div>
        </button>

        {/* 3. Mute Audio */}
        <button
          type="button"
          onClick={onMuteToggle}
          className={`relative z-10 min-h-[86px] rounded-2xl p-3.5 flex flex-col justify-between text-left transition-all active:scale-95 border ${
            isMuted
              ? 'bg-[#E5C158]/15 border-[#E5C158]/60 shadow-[0_0_20px_-4px_rgba(229,193,88,0.25)]'
              : 'bg-[#121215] border-[#27272A] hover:border-[#3F3F46]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                isMuted
                  ? 'bg-[#E5C158] text-[#09090B] border-[#E5C158]'
                  : 'bg-[#1C1B1D] border-[#27272A] text-[#E5C158]'
              }`}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </div>
            {isMuted && <span className="w-2 h-2 rounded-full bg-[#E5C158]" />}
          </div>
          <div className="flex flex-col mt-2">
            <span className="text-sm font-semibold text-[#FAFAFA]">Mute Audio</span>
            <span
              className={`font-mono text-[10px] uppercase ${
                isMuted ? 'text-[#E5C158] font-semibold' : 'text-[#A1A1AA]'
              }`}
            >
              {isMuted ? 'AUDIO MUTED' : 'SYSTEM SOUND'}
            </span>
          </div>
        </button>

        {/* 4. Notch Mini-Pill */}
        <button
          type="button"
          onClick={onNotchMiniPill}
          className={`relative z-10 min-h-[86px] rounded-2xl p-3.5 flex flex-col justify-between text-left transition-all active:scale-95 border ${
            miniPillActive
              ? 'bg-[#E5C158]/15 border-[#E5C158]/60'
              : 'bg-[#121215] border-[#27272A] hover:border-[#3F3F46]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-9 h-9 rounded-xl bg-[#1C1B1D] border border-[#27272A] flex items-center justify-center text-[#FFE08B]">
              <Maximize2 className="w-5 h-5" />
            </div>
            {miniPillActive && <span className="w-2 h-2 rounded-full bg-[#E5C158]" />}
          </div>
          <div className="flex flex-col mt-2">
            <span className="text-sm font-semibold text-[#FAFAFA]">Notch Mini-Pill</span>
            <span className="font-mono text-[10px] text-[#A1A1AA] uppercase">
              {miniPillActive ? 'COLLAPSED' : 'TOGGLE ISLAND'}
            </span>
          </div>
        </button>

        {/* 5. Find File */}
        <button
          type="button"
          onClick={onFindFile}
          className="relative z-10 min-h-[86px] rounded-2xl p-3.5 flex flex-col justify-between text-left bg-[#121215] border border-[#27272A] hover:border-[#3F3F46] transition-all active:scale-95"
        >
          <div className="w-9 h-9 rounded-xl bg-[#1C1B1D] border border-[#27272A] flex items-center justify-center text-[#FAFAFA]">
            <FolderSearch className="w-5 h-5" />
          </div>
          <div className="flex flex-col mt-2">
            <span className="text-sm font-semibold text-[#FAFAFA]">Find File</span>
            <span className="font-mono text-[10px] text-[#A1A1AA] uppercase">
              Quick Search
            </span>
          </div>
        </button>

        {/* 6. Lock PC */}
        <button
          type="button"
          onClick={onLockRequest}
          className="relative z-10 min-h-[86px] rounded-2xl p-3.5 flex flex-col justify-between text-left bg-[#121215] border border-[#27272A] hover:border-rose-500/40 transition-all active:scale-95"
        >
          <div className="w-9 h-9 rounded-xl bg-[#1C1B1D] border border-[#27272A] flex items-center justify-center text-[#F87171]">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex flex-col mt-2">
            <span className="text-sm font-semibold text-[#FAFAFA]">Lock PC</span>
            <span className="font-mono text-[10px] text-[#F87171] uppercase">
              Workstation
            </span>
          </div>
        </button>
      </div>
    </section>
  );
};
