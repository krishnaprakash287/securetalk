// ==============================================================================
// SecureTalk Local Message Search Component
// Searches plaintext in-memory only over locally decrypted messages
// Server never sees the search query or plaintext contents
// ==============================================================================

import React, { useState } from 'react';
import { Search, X, ChevronUp, ChevronDown, Lock } from 'lucide-react';
import type { DecryptedMessage } from '../../crypto/types';

interface LocalMessageSearchProps {
  messages: DecryptedMessage[];
  onClose: () => void;
  onSelectResult: (messageId: string) => void;
}

export const LocalMessageSearch: React.FC<LocalMessageSearchProps> = ({
  messages,
  onClose,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const results = messages.filter((m) => {
    if (!query.trim()) return false;
    return m.text.toLowerCase().includes(query.toLowerCase().trim());
  });

  const handleNext = () => {
    if (results.length === 0) return;
    const nextIdx = (currentIndex + 1) % results.length;
    setCurrentIndex(nextIdx);
    onSelectResult(results[nextIdx].id);
  };

  const handlePrev = () => {
    if (results.length === 0) return;
    const prevIdx = (currentIndex - 1 + results.length) % results.length;
    setCurrentIndex(prevIdx);
    onSelectResult(results[prevIdx].id);
  };

  return (
    <div className="bg-[#0b101b]/95 backdrop-blur-md border-b border-white/[0.08] px-4 py-2.5 flex items-center justify-between gap-3 text-xs select-none shadow-sm animate-in slide-in-from-top-1 duration-150">
      <div className="flex items-center gap-2.5 flex-1 max-w-md">
        <Search className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCurrentIndex(0);
          }}
          placeholder="Search decrypted conversation in-memory..."
          autoFocus
          className="w-full bg-[#0f1626] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 focus:outline-none shadow-inner transition-all"
        />
      </div>

      <div className="flex items-center gap-3 text-slate-400">
        <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md">
          {query.trim() ? `${results.length > 0 ? currentIndex + 1 : 0} of ${results.length}` : 'Local scan'}
        </span>

        {results.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
              title="Previous match"
              aria-label="Previous match"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
              title="Next match"
              aria-label="Next match"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="h-4 w-px bg-white/[0.08]" />

        <button
          onClick={onClose}
          className="p-1.5 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
          title="Close search"
          aria-label="Close search"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
