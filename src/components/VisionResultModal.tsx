import React, { useState } from 'react';
import {
  ScanEye,
  X,
  Copy,
  Check,
  RefreshCw,
  MessageSquarePlus,
  ZoomIn,
  Monitor
} from 'lucide-react';
import { triggerHaptic, type VisionResultData } from '../types/notchx';

interface VisionResultModalProps {
  result: VisionResultData | null;
  isScanning: boolean;
  accentHex: string;
  onClose: () => void;
  onScanAgain: () => void;
  onAskFollowUp: (explanation: string) => void;
}

function renderFormattedExplanation(text: string): React.ReactNode {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.replace(/^```[^\n]*\n?/, '').replace(/```$/, '');
      return (
        <pre
          key={idx}
          className="my-2 p-3 rounded-xl bg-[#09090B] border border-[#27272A] font-mono text-xs text-[#FFDE82] overflow-x-auto whitespace-pre-wrap"
        >
          {code}
        </pre>
      );
    }

    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <p key={idx} className="text-sm text-[#E5E1E4] leading-relaxed whitespace-pre-wrap">
        {inlineParts.map((seg, sIdx) =>
          seg.startsWith('`') && seg.endsWith('`') ? (
            <code
              key={sIdx}
              className="px-1.5 py-0.5 rounded bg-[#09090B] border border-[#27272A] font-mono text-xs text-[#E5C158]"
            >
              {seg.slice(1, -1)}
            </code>
          ) : (
            seg
          )
        )}
      </p>
    );
  });
}

export const VisionResultModal: React.FC<VisionResultModalProps> = ({
  result,
  isScanning,
  accentHex,
  onClose,
  onScanAgain,
  onAskFollowUp
}) => {
  const [copied, setCopied] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  if (!result) return null;

  const handleCopy = async () => {
    triggerHaptic(10);
    try {
      await navigator.clipboard.writeText(result.explanation);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="w-full max-w-md max-h-[88dvh] bg-[#121215] border-t sm:border border-[#E5C158]/60 rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden pb-safe"
          style={{ boxShadow: '0 0 36px -8px rgba(229, 193, 88, 0.25)' }}
        >
          {/* Sheet Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A] shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#09090B]"
                style={{ backgroundColor: accentHex }}
              >
                <ScanEye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-[#FAFAFA]">
                  Vision Scan Analysis
                </h3>
                <span className="font-mono text-[10px] text-[#E5C158] uppercase">
                  Gemini Vision · Windows Screen
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Vision Sheet"
              className="p-2 rounded-full bg-[#1C1B1D] border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {/* 1. Captured PC Screenshot Preview */}
            {result.screenshotUrl ? (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setZoomed(true);
                }}
                className="relative w-full rounded-xl overflow-hidden border border-[#27272A] bg-[#09090B] group text-left active:scale-[0.99] transition-transform"
              >
                <img
                  src={result.screenshotUrl}
                  alt="Captured PC Screen"
                  className="w-full max-h-52 object-cover"
                />
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#09090B]/85 border border-[#27272A] font-mono text-[10px] text-[#FAFAFA]">
                  <ZoomIn className="w-3 h-3 text-[#E5C158]" />
                  Tap to Zoom
                </span>
              </button>
            ) : (
              <div className="w-full rounded-xl border border-[#27272A] bg-[#09090B] px-4 py-3 flex items-center gap-3">
                <Monitor className="w-5 h-5 text-[#E5C158] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#FAFAFA]">
                    Tangkapan Layar PC Diproses
                  </div>
                  <div className="font-mono text-[10px] text-[#A1A1AA] truncate">
                    Analisis visual selesai tanpa preview gambar eksternal
                  </div>
                </div>
              </div>
            )}

            {/* 2. AI Explanation */}
            <div className="rounded-2xl bg-[#0E0E10] border border-[#27272A] p-4 flex flex-col gap-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Penjelasan AI
              </span>
              {renderFormattedExplanation(result.explanation)}
            </div>
          </div>

          {/* 3. Action Buttons */}
          <div className="px-5 py-3.5 border-t border-[#27272A] bg-[#0E0E10] grid grid-cols-3 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="py-2.5 px-2 rounded-xl bg-[#1C1B1D] border border-[#27272A] text-[11px] font-semibold text-[#FAFAFA] flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#E5C158]" />
                  <span className="truncate">Copy Explanation</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onScanAgain}
              disabled={isScanning}
              className="py-2.5 px-2 rounded-xl bg-[#1C1B1D] border border-[#27272A] text-[11px] font-semibold text-[#FAFAFA] flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#E5C158] ${isScanning ? 'animate-spin' : ''}`} />
              <span>Scan Again</span>
            </button>

            <button
              type="button"
              onClick={() => onAskFollowUp(result.explanation)}
              className="py-2.5 px-2 rounded-xl text-[11px] font-bold text-[#09090B] flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              style={{ backgroundColor: accentHex }}
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span className="truncate">Ask Follow-Up</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Screenshot Lightbox */}
      {zoomed && result.screenshotUrl && (
        <div
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-2 cursor-zoom-out"
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Exit Fullscreen"
            className="absolute top-4 right-4 p-2.5 rounded-full bg-[#121215] border border-[#27272A] text-[#FAFAFA]"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={result.screenshotUrl}
            alt="Fullscreen PC Capture"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
};
