// ==============================================================================
// SecureTalk Safety Number (Cryptographic Fingerprint) Verification Modal
// Enables out-of-band identity verification to prevent active MITM attacks
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Copy, Check, Info } from 'lucide-react';
import { chatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import type { Profile } from '../types/database';

interface SafetyNumberModalProps {
  isOpen?: boolean;
  onClose: () => void;
  partner: Profile;
}

export const SafetyNumberModal: React.FC<SafetyNumberModalProps> = ({
  isOpen = true,
  onClose,
  partner,
}) => {
  const { user } = useAuth();
  const [safetyNumber, setSafetyNumber] = useState<string>('Computing fingerprint...');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    setSafetyNumber('Computing fingerprint...');
    chatService.getConversationSafetyNumber(user.id, partner.id)
      .then((num) => setSafetyNumber(num))
      .catch(() => setSafetyNumber('Fingerprint unavailable'));
  }, [isOpen, user, partner.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(safetyNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-[#0e1422] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-white/[0.07] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">Verify Safety Numbers</h3>
              <span className="text-[11px] font-mono text-emerald-400">@{partner.username}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Compare this safety number with <span className="text-white font-semibold">@{partner.username}</span> in person or via an independent channel. If the numbers match, your conversation cannot be decrypted or intercepted by any third party.
        </p>

        {/* Safety Number Digits Display */}
        <div className="p-4 bg-[#080d16] border border-white/[0.08] rounded-xl shadow-inner">
          <div className="grid grid-cols-2 gap-2.5 text-center font-mono text-sm tracking-widest text-emerald-300 select-all font-semibold">
            {safetyNumber.split(' ').map((chunk, idx) => (
              <span key={idx} className="bg-[#101726] py-2 px-3 rounded-lg border border-white/[0.06] shadow-sm">
                {chunk}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>SHA-256(KeyA || KeyB)</span>
          </div>

          <button
            onClick={handleCopy}
            className="btn-secondary text-xs py-1.5 px-3.5 flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
