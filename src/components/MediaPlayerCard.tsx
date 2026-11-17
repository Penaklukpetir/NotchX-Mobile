import React from 'react';
import {
  Disc3,
  Mic,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  AudioWaveform
} from 'lucide-react';
import { formatSeconds, type MediaState } from '../types/notchx';

interface MediaPlayerCardProps {
  media: MediaState;
  accentHex: string;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onSeek: (pct: number) => void;
}

export const MediaPlayerCard: React.FC<MediaPlayerCardProps> = ({
  media,
  accentHex,
  onPlayPause,
  onPrev,
  onNext,
  onToggleShuffle,
  onToggleRepeat,
  onSeek
}) => {
  const remainingSec = Math.max(0, media.durationSec - media.elapsedSec);

  return (
    <section className="w-full nx-cockpit-card rounded-[22px] p-4 relative overflow-hidden shadow-xl flex flex-col gap-3.5">
      {/* Ambient Soft Glow Behind Album */}
      <div
        className="absolute -top-12 -left-12 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-20 transition-colors duration-500"
        style={{ backgroundColor: accentHex }}
      />

      {/* Header Track Info Row */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[#201F22] border border-[#27272A] shadow-md flex items-center justify-center">
            {media.albumArt ? (
              <img
                src={media.albumArt}
                alt={media.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#2A2A2C] via-[#121215] to-[#09090B] flex items-center justify-center">
                <Disc3
                  className={`w-8 h-8 text-[#E5C158] ${
                    media.isPlaying ? 'animate-spin' : 'opacity-80'
                  }`}
                  style={{ animationDuration: '6s' }}
                />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10]/50 to-transparent pointer-events-none" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-display text-[17px] leading-6 font-semibold text-[#E5E1E4] truncate">
                {media.title}
              </h2>
              {media.isPlaying && (
                <div className="flex items-end gap-[2px] h-3.5 flex-shrink-0 ml-1">
                  <span
                    className="w-[2.5px] h-3 rounded-full nx-eq-bar"
                    style={{ backgroundColor: accentHex, animationDelay: '0ms' }}
                  />
                  <span
                    className="w-[2.5px] h-2 rounded-full nx-eq-bar"
                    style={{ backgroundColor: accentHex, animationDelay: '180ms' }}
                  />
                  <span
                    className="w-[2.5px] h-3.5 rounded-full nx-eq-bar"
                    style={{ backgroundColor: accentHex, animationDelay: '320ms' }}
                  />
                  <span
                    className="w-[2.5px] h-1.5 rounded-full nx-eq-bar"
                    style={{ backgroundColor: accentHex, animationDelay: '90ms' }}
                  />
                </div>
              )}
            </div>
            <span className="text-xs text-[#99907D] truncate mt-0.5">{media.artist}</span>
          </div>
        </div>

        {/* Windows Media Source Tag */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#201F22] border border-[#27272A] flex-shrink-0">
          <AudioWaveform className="w-3.5 h-3.5 text-[#4EDEA3]" />
          <span className="font-mono text-[10px] font-semibold tracking-wider text-[#D0C5B1] uppercase">
            {media.source}
          </span>
        </div>
      </div>

      {/* Synchronized Live Lyrics Preview Container */}
      <div className="relative z-10 nx-recessed-well rounded-xl p-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Mic
            className={`w-3.5 h-3.5 flex-shrink-0 ${
              media.isPlaying ? 'animate-pulse' : 'opacity-70'
            }`}
            style={{ color: accentHex }}
          />
          <p
            className="text-[13px] font-medium tracking-tight truncate"
            style={{ color: accentHex }}
          >
            {media.currentLyric}
          </p>
        </div>
        <p className="text-xs text-[#99907D] pl-[22px] truncate opacity-75">
          {media.nextLyric}
        </p>
      </div>

      {/* Interactive Progress Scrub Bar */}
      <div className="relative z-10 flex flex-col gap-1.5 pt-0.5">
        <div className="relative w-full h-2 bg-[#27272A] rounded-full cursor-pointer">
          <div
            className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-150"
            style={{ width: `${media.progress}%`, backgroundColor: accentHex }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full pointer-events-none transition-all duration-150"
            style={{
              left: `calc(${media.progress}% - 7px)`,
              backgroundColor: '#FFE08B',
              boxShadow: `0 0 10px ${accentHex}`
            }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={media.progress}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Track progress"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <div className="flex justify-between items-center text-[#99907D] font-mono text-[11px] tabular-nums">
          <span>{formatSeconds(media.elapsedSec)}</span>
          <span>-{formatSeconds(remainingSec)}</span>
        </div>
      </div>

      {/* Playback Tactile Control Bar */}
      <div className="relative z-10 flex items-center justify-between px-2 pt-0.5">
        <button
          type="button"
          onClick={onToggleShuffle}
          aria-label="Shuffle"
          className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${
            media.shuffle ? 'text-[#E5C158] bg-[#E5C158]/10' : 'text-[#99907D] hover:text-[#E5E1E4]'
          }`}
        >
          <Shuffle className="w-[18px] h-[18px]" />
        </button>

        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous Track"
          className="w-11 h-11 rounded-full bg-[#201F22] border border-[#27272A] hover:border-[#3F3F46] flex items-center justify-center text-[#E5E1E4] active:scale-90 transition-transform"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onPlayPause}
          aria-label={media.isPlaying ? 'Pause' : 'Play'}
          className="w-14 h-14 rounded-full text-[#09090B] flex items-center justify-center active:scale-95 transition-all"
          style={{
            backgroundColor: accentHex,
            boxShadow: media.isPlaying
              ? '0 0 24px rgba(229, 193, 88, 0.45)'
              : '0 6px 18px rgba(0, 0, 0, 0.45)'
          }}
        >
          {media.isPlaying ? (
            <Pause className="w-7 h-7 fill-current" />
          ) : (
            <Play className="w-7 h-7 fill-current ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next Track"
          className="w-11 h-11 rounded-full bg-[#201F22] border border-[#27272A] hover:border-[#3F3F46] flex items-center justify-center text-[#E5E1E4] active:scale-90 transition-transform"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onToggleRepeat}
          aria-label="Repeat"
          className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${
            media.repeat ? 'text-[#E5C158] bg-[#E5C158]/10' : 'text-[#99907D] hover:text-[#E5E1E4]'
          }`}
        >
          <Repeat className="w-[18px] h-[18px]" />
        </button>
      </div>
    </section>
  );
};
