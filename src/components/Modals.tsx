import React, { useState } from 'react';
import {
  Clipboard,
  X,
  ShieldAlert,
  Link2,
  QrCode,
  Copy,
  Check,
  MonitorCheck
} from 'lucide-react';
import { triggerHaptic } from '../types/notchx';

interface PairingModalProps {
  open: boolean;
  isConnected: boolean;
  supabaseUrl: string;
  supabaseKey: string;
  deviceId: string;
  accentHex: string;
  onChangeUrl: (v: string) => void;
  onChangeKey: (v: string) => void;
  onChangeDeviceId: (v: string) => void;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  open,
  isConnected,
  supabaseUrl,
  supabaseKey,
  deviceId,
  accentHex,
  onChangeUrl,
  onChangeKey,
  onChangeDeviceId,
  onSave,
  onClose
}) => {
  const [copiedPair, setCopiedPair] = useState(false);

  if (!open) return null;

  const pairingString = `notchx://pair?device=${encodeURIComponent(deviceId || 'windows')}`;

  const copyPairingCode = async () => {
    triggerHaptic(10);
    try {
      await navigator.clipboard.writeText(pairingString);
      setCopiedPair(true);
      setTimeout(() => setCopiedPair(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <form
        onSubmit={onSave}
        className="w-full max-w-sm bg-[#121215] border border-[#27272A] rounded-3xl p-5 flex flex-col gap-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4" style={{ color: accentHex }} />
            <h3 className="font-display text-sm font-semibold text-[#E5E1E4]">
              Desktop Pairing & Link
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#201F22] text-[#99907D] hover:text-[#E5E1E4]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Desktop Pairing Card */}
        <div className="nx-recessed-well rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#201F22] border border-[#27272A] flex items-center justify-center shrink-0">
              <QrCode className="w-6 h-6" style={{ color: accentHex }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? 'bg-[#4EDEA3] animate-pulse' : 'bg-[#99907D]'
                  }`}
                />
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#D0C5B1]">
                  {isConnected ? 'Desktop Linked' : 'Pairing Standby'}
                </span>
              </div>
              <div className="text-xs font-mono font-semibold text-[#E5E1E4] truncate mt-0.5">
                TARGET: {deviceId || 'windows'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={copyPairingCode}
            className="px-2.5 py-1.5 rounded-lg bg-[#201F22] border border-[#27272A] text-[10px] font-mono text-[#D0C5B1] flex items-center gap-1 active:scale-95 transition-transform shrink-0"
          >
            {copiedPair ? <Check className="w-3 h-3 text-[#4EDEA3]" /> : <Copy className="w-3 h-3" />}
            {copiedPair ? 'Copied' : 'URI'}
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] uppercase tracking-wider text-[#99907D]">
            Target Device ID
          </label>
          <div className="relative flex items-center">
            <MonitorCheck className="w-3.5 h-3.5 text-[#99907D] absolute left-3" />
            <input
              type="text"
              value={deviceId}
              onChange={(e) => onChangeDeviceId(e.target.value)}
              placeholder="windows"
              className="w-full rounded-xl bg-[#0E0E10] border border-[#27272A] pl-9 pr-3 py-2 text-xs font-mono text-[#E5E1E4] focus:outline-none focus:border-[#E5C158]/60"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] uppercase tracking-wider text-[#99907D]">
            Supabase URL
          </label>
          <input
            type="text"
            value={supabaseUrl}
            onChange={(e) => onChangeUrl(e.target.value)}
            placeholder="https://your-project.supabase.co"
            className="w-full rounded-xl bg-[#0E0E10] border border-[#27272A] px-3 py-2 text-xs text-[#E5E1E4] focus:outline-none focus:border-[#E5C158]/60"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] uppercase tracking-wider text-[#99907D]">
            Supabase Anon / Publishable Key
          </label>
          <input
            type="password"
            value={supabaseKey}
            onChange={(e) => onChangeKey(e.target.value)}
            placeholder="sb_publishable_... or eyJ..."
            className="w-full rounded-xl bg-[#0E0E10] border border-[#27272A] px-3 py-2 text-xs text-[#E5E1E4] focus:outline-none focus:border-[#E5C158]/60"
          />
        </div>

        <button
          type="submit"
          className="py-2.5 rounded-xl text-xs font-semibold text-[#09090B] mt-1 active:scale-95 transition-transform"
          style={{ backgroundColor: accentHex }}
        >
          Save & Sync to Widget Bridge
        </button>
      </form>
    </div>
  );
};

interface ClipboardModalProps {
  open: boolean;
  value: string;
  accentHex: string;
  onChange: (v: string) => void;
  onPull: () => void;
  onPush: () => void;
  onClose: () => void;
}

export const ClipboardModal: React.FC<ClipboardModalProps> = ({
  open,
  value,
  accentHex,
  onChange,
  onPull,
  onPush,
  onClose
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#121215] border border-[#27272A] rounded-3xl p-5 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-[#E5E1E4] flex items-center gap-2">
            <Clipboard className="w-4 h-4" style={{ color: accentHex }} />
            Sync Clipboard Laptop
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#201F22] text-[#99907D] hover:text-[#E5E1E4]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste text or links here to push directly to Windows clipboard..."
          className="w-full rounded-2xl bg-[#0E0E10] border border-[#27272A] p-3 text-xs text-[#E5E1E4] focus:outline-none focus:border-[#E5C158]/60"
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPull}
            className="py-2.5 px-3 rounded-xl bg-[#201F22] hover:bg-[#2A2A2C] border border-[#27272A] text-xs font-medium text-[#E5E1E4] active:scale-95 transition-transform"
          >
            Ambil dari PC
          </button>
          <button
            type="button"
            onClick={onPush}
            className="py-2.5 px-3 rounded-xl text-xs font-semibold text-[#09090B] active:scale-95 transition-transform"
            style={{ backgroundColor: accentHex }}
          >
            Kirim ke PC
          </button>
        </div>
      </div>
    </div>
  );
};

interface LockConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const LockConfirmModal: React.FC<LockConfirmModalProps> = ({
  open,
  onCancel,
  onConfirm
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#121215] border border-[#27272A] rounded-3xl p-5 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center gap-2.5 text-[#F87171]">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <h3 className="font-display text-sm font-semibold text-[#E5E1E4]">
            Kunci Layar Laptop Sekarang?
          </h3>
        </div>
        <p className="text-xs text-[#99907D] leading-relaxed">
          Laptop Windows Anda akan langsung menjalankan{' '}
          <code className="text-[#E5E1E4] font-mono">LockWorkStation()</code> dan meminta PIN/Password saat dibuka kembali.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 rounded-xl bg-[#201F22] border border-[#27272A] text-xs font-medium text-[#D0C5B1] active:scale-95 transition-transform"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="py-2.5 rounded-xl bg-rose-500 text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            Ya, Kunci PC
          </button>
        </div>
      </div>
    </div>
  );
};
