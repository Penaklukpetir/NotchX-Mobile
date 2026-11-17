import React from 'react';
import {
  Send,
  Mic,
  MicOff,
  Clipboard,
  ScanEye,
  Eraser,
  Sparkles,
  FolderSearch
} from 'lucide-react';
import { CommandFeed } from './CommandFeed';
import type { NotchXCommandRow, FileSuggestion } from '../types/notchx';

interface CommandTabProps {
  promptText: string;
  speechLang: 'id-ID' | 'en-US';
  isListening: boolean;
  liveTranscript: string;
  isScanningVision: boolean;
  accentHex: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  commands: NotchXCommandRow[];
  copiedId: string | null;
  uploadingFiles: Record<string, string | boolean>;
  onChangePrompt: (v: string) => void;
  onToggleSpeechLang: () => void;
  onToggleVoice: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onOpenClipboard: () => void;
  onVisionScan: () => void;
  onClearIsland: () => void;
  onQuickFilePrompt: () => void;
  onRefreshFeed: () => void;
  onCopyResult: (id: string, text: string) => void;
  onFetchFile: (file: FileSuggestion) => void;
}

export const CommandTab: React.FC<CommandTabProps> = ({
  promptText,
  speechLang,
  isListening,
  liveTranscript,
  isScanningVision,
  accentHex,
  inputRef,
  commands,
  copiedId,
  uploadingFiles,
  onChangePrompt,
  onToggleSpeechLang,
  onToggleVoice,
  onSubmit,
  onOpenClipboard,
  onVisionScan,
  onClearIsland,
  onQuickFilePrompt,
  onRefreshFeed,
  onCopyResult,
  onFetchFile
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Quick Note & AI Push Card */}
      <section className="w-full bg-[#121215] border border-[#27272A] rounded-3xl p-4 flex flex-col gap-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: accentHex }} />
            <h2 className="font-display text-sm font-bold text-[#FAFAFA]">
              Quick Note & Voice AI Push
            </h2>
          </div>
          <button
            type="button"
            onClick={onToggleSpeechLang}
            className="px-2.5 py-1 rounded-full bg-[#1C1B1D] border border-[#27272A] font-mono text-[10px] font-semibold text-[#D0C5B1] active:scale-95"
          >
            Voice: {speechLang === 'id-ID' ? 'ID' : 'EN'}
          </button>
        </div>

        {/* Live Listening Indicator inside Command Card */}
        {isListening && (
          <div className="rounded-2xl bg-[#E5C158]/10 border border-[#E5C158]/60 px-3.5 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5C158] animate-ping shrink-0" />
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#E5C158]">
                  Mendengarkan ({speechLang})...
                </div>
                <div className="text-xs text-[#FAFAFA] truncate">
                  {liveTranscript || 'Ucapkan perintah ke laptop sekarang...'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleVoice}
              className="px-2.5 py-1 rounded-lg bg-[#E5C158] text-[#09090B] font-mono text-[10px] font-bold uppercase shrink-0 active:scale-95"
            >
              Stop
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 bg-[#09090B] border border-[#27272A] focus-within:border-[#E5C158]/60 rounded-2xl px-3 py-2.5">
            <input
              ref={inputRef}
              type="text"
              value={promptText}
              onChange={(e) => onChangePrompt(e.target.value)}
              placeholder="Send note, URL, file query, or speak..."
              className="flex-1 bg-transparent text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus:outline-none min-w-0"
            />
            <button
              type="button"
              onClick={onToggleVoice}
              aria-label="Voice Command"
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all shrink-0 active:scale-95 ${
                isListening
                  ? 'bg-[#E5C158] border-[#E5C158] text-[#09090B] animate-pulse shadow-[0_0_20px_rgba(229,193,88,0.55)]'
                  : 'bg-[#1C1B1D] border-[#E5C158]/40 text-[#E5C158] hover:border-[#E5C158]'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl text-sm font-bold text-[#09090B] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
            style={{
              backgroundColor: accentHex,
              boxShadow: '0 8px 24px -6px rgba(229, 193, 88, 0.4)'
            }}
          >
            <Send className="w-4 h-4" />
            Send to NotchX
          </button>
        </form>

        {/* One-Tap Preset Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={onOpenClipboard}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C1B1D] border border-[#27272A] hover:border-[#3F3F46] text-xs font-medium text-[#FAFAFA] active:scale-95 transition-transform"
          >
            <Clipboard className="w-3.5 h-3.5 text-[#E5C158]" />
            Clipboard Sync
          </button>

          <button
            type="button"
            onClick={onVisionScan}
            disabled={isScanningVision}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C1B1D] border border-[#27272A] hover:border-[#E5C158]/50 text-xs font-medium text-[#FAFAFA] active:scale-95 transition-transform"
          >
            <ScanEye className="w-3.5 h-3.5 text-[#E5C158]" />
            {isScanningVision ? 'Scanning...' : 'Vision Scan'}
          </button>

          <button
            type="button"
            onClick={onClearIsland}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C1B1D] border border-[#27272A] hover:border-[#3F3F46] text-xs font-medium text-[#FAFAFA] active:scale-95 transition-transform"
          >
            <Eraser className="w-3.5 h-3.5 text-[#A1A1AA]" />
            Clear Island
          </button>

          <button
            type="button"
            onClick={onQuickFilePrompt}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C1B1D] border border-[#27272A] hover:border-[#3F3F46] text-xs font-medium text-[#FAFAFA] active:scale-95 transition-transform"
          >
            <FolderSearch className="w-3.5 h-3.5 text-[#4EDEA3]" />
            Cari File
          </button>
        </div>
      </section>

      {/* Live Telemetry & File Transfer Feed */}
      <CommandFeed
        commands={commands}
        copiedId={copiedId}
        uploadingFiles={uploadingFiles}
        maxItems={20}
        onRefresh={onRefreshFeed}
        onCopyResult={onCopyResult}
        onFetchFile={onFetchFile}
      />
    </div>
  );
};
