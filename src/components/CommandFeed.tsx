import React from 'react';
import {
  RefreshCw,
  Check,
  Copy,
  Loader2,
  ArrowUpRight,
  CheckCircle2,
  Download
} from 'lucide-react';
import {
  formatPayloadText,
  parseStructuredResult,
  getFileVisualMeta
} from '../lib/commandParsers';
import { triggerHaptic, type NotchXCommandRow, type FileSuggestion } from '../types/notchx';

interface CommandFeedProps {
  commands: NotchXCommandRow[];
  copiedId: string | null;
  uploadingFiles: Record<string, string | boolean>;
  maxItems?: number;
  onRefresh: () => void;
  onCopyResult: (id: string, text: string) => void;
  onFetchFile: (file: FileSuggestion) => void;
}

export const CommandFeed: React.FC<CommandFeedProps> = ({
  commands,
  copiedId,
  uploadingFiles,
  maxItems,
  onRefresh,
  onCopyResult,
  onFetchFile
}) => {
  const visibleCommands = maxItems ? commands.slice(0, maxItems) : commands;

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#99907D]">
          Live Telemetry & Results
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1 font-mono text-[10px] uppercase text-[#99907D] hover:text-[#E5E1E4] active:scale-95 transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {visibleCommands.length === 0 ? (
        <div className="nx-cockpit-card rounded-2xl p-5 text-center text-[#99907D] text-xs">
          No active telemetry yet. Trigger a hardware control or send an AI prompt below.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visibleCommands.map((cmd) => {
            const isPending = cmd.status === 'pending';
            const isError = cmd.status === 'error';
            const structured = !isPending ? parseStructuredResult(cmd.result_text) : null;

            return (
              <article
                key={cmd.id}
                className="nx-cockpit-card rounded-2xl p-4 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider border ${
                        isPending
                          ? 'bg-[#E5C158]/15 text-[#FFDE82] border-[#E5C158]/35 animate-pulse'
                          : isError
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-[#10B981]/15 text-[#4EDEA3] border-[#10B981]/30'
                      }`}
                    >
                      {cmd.status || 'pending'}
                    </span>
                    <span className="text-[10px] font-mono text-[#99907D] uppercase">
                      {cmd.command_type}
                    </span>
                  </div>

                  {cmd.result_text && !structured && (
                    <button
                      type="button"
                      onClick={() => onCopyResult(cmd.id, cmd.result_text || '')}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#201F22] hover:bg-[#2A2A2C] border border-[#27272A] text-[11px] text-[#D0C5B1] active:scale-95 transition-transform"
                    >
                      {copiedId === cmd.id ? (
                        <>
                          <Check className="w-3 h-3 text-[#4EDEA3]" />
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

                <div className="text-xs font-medium text-[#E5E1E4]">
                  “{formatPayloadText(cmd.payload)}”
                </div>

                {isPending ? (
                  <div className="text-[11px] text-[#FFDE82] flex items-center gap-2 pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E5C158] animate-ping" />
                    {cmd.command_type === 'fetch_file'
                      ? 'Mengunggah file dari laptop ke cloud...'
                      : 'Menunggu eksekusi dari NotchX.exe di laptop...'}
                  </div>
                ) : structured?.kind === 'file_suggestions' ? (
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-[#99907D] px-0.5">
                      <span>
                        Ditemukan <strong className="text-[#E5E1E4]">{structured.files.length}</strong> file
                        {structured.query ? ` (${structured.query})` : ''}
                      </span>
                      <span className="font-mono text-[10px] text-[#E5C158] uppercase">
                        Tap untuk kirim ke HP
                      </span>
                    </div>

                    {structured.files.length === 0 ? (
                      <div className="text-xs text-[#99907D] nx-recessed-well rounded-xl p-3">
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
                              onClick={() => onFetchFile(file)}
                              className="w-full text-left rounded-xl p-3 bg-[#0E0E10] hover:bg-[#1C1B1D] border border-[#E5C158]/25 hover:border-[#E5C158]/60 transition-all flex items-center justify-between gap-3 group active:scale-[0.98]"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border border-[#27272A]"
                                  style={{ backgroundColor: `${color}18`, color }}
                                >
                                  <FileIcon className="w-4 h-4" />
                                  <span className="text-[8px] font-mono font-bold tracking-tighter mt-0.5">
                                    {badge}
                                  </span>
                                </div>

                                <div className="min-w-0 flex flex-col">
                                  <span className="text-xs font-semibold text-[#E5E1E4] truncate">
                                    {file.fileName}
                                  </span>
                                  <span className="font-mono text-[10px] text-[#99907D] truncate">
                                    {[file.sizeFormatted, file.lastModified]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {isUploading ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#E5C158]/15 border border-[#E5C158]/40 text-[10px] font-semibold text-[#FFDE82]">
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
                  <div
                    className="mt-1 rounded-2xl p-4 border flex flex-col gap-3"
                    style={{
                      background:
                        'linear-gradient(145deg, rgba(229, 193, 88, 0.14) 0%, rgba(9, 9, 11, 0.96) 100%)',
                      borderColor: 'rgba(229, 193, 88, 0.45)',
                      boxShadow: '0 12px 30px rgba(229, 193, 88, 0.12)'
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#E5C158]/20 border border-[#E5C158]/40 flex items-center justify-center text-[#E5C158] shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#E5C158]">
                          File Siap Diunduh
                        </div>
                        <div className="text-xs font-bold text-[#E5E1E4] truncate">
                          {structured.fileName}
                        </div>
                        {structured.sizeFormatted && (
                          <div className="font-mono text-[10px] text-[#99907D]">
                            Ukuran: {structured.sizeFormatted}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={structured.downloadUrl}
                        download={structured.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => triggerHaptic(16)}
                        className="py-2.5 px-3 rounded-xl bg-[#E5C158] text-[#09090B] text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(229,193,88,0.35)] active:scale-95 transition-transform"
                      >
                        <Download className="w-4 h-4" />
                        Download File
                      </a>

                      <button
                        type="button"
                        onClick={() => onCopyResult(cmd.id, structured.downloadUrl)}
                        className="py-2.5 px-3 rounded-xl bg-[#201F22] hover:bg-[#2A2A2C] border border-[#27272A] text-xs font-semibold text-[#E5E1E4] flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                      >
                        {copiedId === cmd.id ? (
                          <>
                            <Check className="w-4 h-4 text-[#4EDEA3]" />
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
                    <pre className="text-xs text-[#D0C5B1] nx-recessed-well rounded-xl p-3 whitespace-pre-wrap font-sans leading-relaxed overflow-x-auto">
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
  );
};
