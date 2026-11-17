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
    <div className="flex flex-col gap-3.5">
      {/* Main Now-Playing Hero Card */}
      <section className="w-full bg-[#121215] border border-[#27272A] rounded-3xl p-5 relative overflow-hidden shadow-xl flex flex-col items-center gap-4">
        {/* Ambient Soft Glow */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-20 transition-colors duration-500"
          style={{ backgroundColor: accentHex }}
        />

        {/* Source Badge Row */}
        <div className="relative z-10 w-full flex items-center justify-between">
          <span className="font-mono text-[10px] font-semibold tracking-widest text-[#A1A1AA] uppercase">
            Now Playing
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1C1B1D] border border-[#27272A]">
            <AudioWaveform className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="font-mono text-[10px] font-semibold tracking-wider text-[#FAFAFA] uppercase">
              {media.source || 'SPOTIFY'}
            </span>
          </div>
        </div>

        {/* Clean 176x176 Album Art Card */}
        <div className="relative z-10 w-[176px] h-[176px] rounded-2xl overflow-hidden bg-[#18181B] border border-[#27272A] shadow-2xl flex items-center justify-center shrink-0">
          {media.albumArt ? (
            <img
              src={media.albumArt}
              alt={media.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#201F22] via-[#121215] to-[#09090B] flex items-center justify-center">
              <Disc3
                className={`w-16 h-16 text-[#E5C158] ${
                  media.isPlaying ? 'animate-spin' : 'opacity-80'
                }`}
                style={{ animationDuration: '6s' }}
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090B]/40 to-transparent pointer-events-none" />
        </div>

        {/* Track Title & Artist */}
        <div className="relative z-10 w-full flex flex-col items-center text-center gap-1">
          <div className="flex items-center justify-center gap-2 max-w-full">
            <h2 className="font-display text-xl font-bold text-[#FAFAFA] truncate">
              {media.title}
            </h2>
            {media.isPlaying && (
              <div className="flex items-end gap-[2px] h-3.5 shrink-0">
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
              </div>
            )}
          </div>
          <span className="text-sm text-[#A1A1AA] truncate max-w-full">{media.artist}</span>
        </div>

        {/* Interactive Progress Scrubber */}
        <div className="relative z-10 w-full flex flex-col gap-1.5 pt-1">
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
          <div className="flex justify-between items-center text-[#A1A1AA] font-mono text-[11px] tabular-nums">
            <span>{formatSeconds(media.elapsedSec)}</span>
            <span>-{formatSeconds(remainingSec)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="relative z-10 w-full flex items-center justify-between px-2 pt-1">
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-label="Shuffle"
            className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${
              media.shuffle ? 'text-[#E5C158] bg-[#E5C158]/10' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            <Shuffle className="w-[18px] h-[18px]" />
          </button>

          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous Track"
            className="w-11 h-11 rounded-full bg-[#1C1B1D] border border-[#27272A] hover:border-[#3F3F46] flex items-center justify-center text-[#FAFAFA] active:scale-90 transition-transform"
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
            className="w-11 h-11 rounded-full bg-[#1C1B1D] border border-[#27272A] hover:border-[#3F3F46] flex items-center justify-center text-[#FAFAFA] active:scale-90 transition-transform"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onToggleRepeat}
            aria-label="Repeat"
            className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${
              media.repeat ? 'text-[#E5C158] bg-[#E5C158]/10' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            <Repeat className="w-[18px] h-[18px]" />
          </button>
        </div>
      </section>

      {/* Dedicated Live Lyrics Card */}
      <section className="w-full bg-[#121215] border border-[#27272A] rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Mic
              className={`w-3.5 h-3.5 ${media.isPlaying ? 'animate-pulse' : 'opacity-70'}`}
              style={{ color: accentHex }}
            />
            <span className="font-mono text-[10px] font-semibold tracking-wider text-[#A1A1AA] uppercase">
              Live Lyrics
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#E5C158] uppercase">Synced</span>
        </div>

        <p
          className="text-base font-semibold leading-snug tracking-tight"
          style={{ color: accentHex }}
        >
          {media.currentLyric}
        </p>
        <p className="text-sm text-[#A1A1AA] leading-snug">
          {media.nextLyric}
        </p>
      </section>
    </div>
  );
};
