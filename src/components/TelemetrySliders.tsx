import React, { useRef, useEffect } from 'react';
import { Volume2, VolumeX, Sun } from 'lucide-react';

interface TelemetrySlidersProps {
  volume: number;
  brightness: number;
  isMuted: boolean;
  accentHex: string;
  onVolumeChange: (val: number) => void;
  onVolumeCommit: (val: number) => void;
  onBrightnessChange: (val: number) => void;
  onBrightnessCommit: (val: number) => void;
}

export const TelemetrySliders: React.FC<TelemetrySlidersProps> = ({
  volume,
  brightness,
  isMuted,
  accentHex,
  onVolumeChange,
  onVolumeCommit,
  onBrightnessChange,
  onBrightnessCommit
}) => {
  const volTimerRef = useRef<number | null>(null);
  const brightTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (volTimerRef.current) window.clearTimeout(volTimerRef.current);
      if (brightTimerRef.current) window.clearTimeout(brightTimerRef.current);
    };
  }, []);

  const handleVolInput = (val: number) => {
    onVolumeChange(val);
    if (volTimerRef.current) window.clearTimeout(volTimerRef.current);
    volTimerRef.current = window.setTimeout(() => {
      onVolumeCommit(val);
    }, 380);
  };

  const handleBrightInput = (val: number) => {
    onBrightnessChange(val);
    if (brightTimerRef.current) window.clearTimeout(brightTimerRef.current);
    brightTimerRef.current = window.setTimeout(() => {
      onBrightnessCommit(val);
    }, 380);
  };

  return (
    <section className="flex flex-col gap-2.5">
      {/* Slider 1: Master PC Volume */}
      <div className="relative w-full h-[52px] nx-cockpit-card rounded-[16px] overflow-hidden flex items-center justify-between px-4 select-none shadow-sm">
        <div
          className="absolute left-0 top-0 bottom-0 rounded-l-[16px] pointer-events-none transition-all duration-150"
          style={{
            width: `${isMuted ? 0 : volume}%`,
            backgroundColor: `${accentHex}38`
          }}
        />
        <div className="relative z-10 flex items-center gap-2.5 pointer-events-none">
          <div className="w-7 h-7 rounded-full bg-[#201F22] border border-[#27272A] flex items-center justify-center">
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-[#F87171]" />
            ) : (
              <Volume2 className="w-4 h-4" style={{ color: accentHex }} />
            )}
          </div>
          <span className="text-sm text-[#E5E1E4] font-medium">Master Volume</span>
        </div>
        <div className="relative z-10 flex items-center gap-1.5 pointer-events-none">
          <span className="font-mono text-sm text-[#E5E1E4] font-semibold tabular-nums">
            {isMuted ? 'MUTE' : `${volume}%`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => handleVolInput(Number(e.target.value))}
          aria-label="Master Volume Control"
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        />
      </div>

      {/* Slider 2: Display Brightness */}
      <div className="relative w-full h-[52px] nx-cockpit-card rounded-[16px] overflow-hidden flex items-center justify-between px-4 select-none shadow-sm">
        <div
          className="absolute left-0 top-0 bottom-0 bg-[#C4C5C5]/20 rounded-l-[16px] pointer-events-none transition-all duration-150"
          style={{ width: `${brightness}%` }}
        />
        <div className="relative z-10 flex items-center gap-2.5 pointer-events-none">
          <div className="w-7 h-7 rounded-full bg-[#201F22] border border-[#27272A] flex items-center justify-center">
            <Sun className="w-4 h-4 text-[#E2E2E2]" />
          </div>
          <span className="text-sm text-[#E5E1E4] font-medium">Display Brightness</span>
        </div>
        <div className="relative z-10 flex items-center gap-1.5 pointer-events-none">
          <span className="font-mono text-sm text-[#E5E1E4] font-semibold tabular-nums">
            {brightness}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={brightness}
          onChange={(e) => handleBrightInput(Number(e.target.value))}
          aria-label="Display Brightness Control"
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        />
      </div>
    </section>
  );
};
