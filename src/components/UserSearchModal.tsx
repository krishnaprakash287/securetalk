// ==============================================================================
// SecureTalk User Discovery Modal
// Search users strictly by @username, never exposes email or phone numbers
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, UserPlus, Check, AlertCircle, Loader2 } from 'lucide-react';
import { userService } from '../services/userService';
import { chatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { UserAvatar } from './UserAvatar';
import { sanitizeErrorMessage } from '../utils/errors';
import type { Profile } from '../types/database';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { refreshRequestsCount } = useChat();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!user) return;
    const trimmed = query.trim().replace(/^@+/, '');
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const found = await userService.searchUsers(trimmed, user.id);
        setResults(found);
      } catch (err) {
        setError(sanitizeErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, user]);

  const handleSendRequest = async (targetUserId: string) => {
    if (!user) return;
    try {
      setError(null);
      await chatService.sendChatRequest(user.id, targetUserId);
      setSentRequests((prev) => new Set(prev).add(targetUserId));
      await refreshRequestsCount();
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
    >
      <div
        className="w-full max-w-lg bg-[#0e1422] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] bg-[#0c111c]/60">
          <h2 id="search-modal-title" className="text-base font-bold text-white flex items-center gap-2.5">
            <Search className="w-4 h-4 text-emerald-400" />
            <span>Find Users by @username</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 border-b border-white/[0.07] bg-[#090d16]">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-slate-500 text-sm">
              @
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="alice24, krishna_dev..."
              className="w-full pl-8.5 pr-10 py-2.5 bg-[#0f1524] border border-white/[0.08] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 font-mono shadow-inner transition-all"
            />
            {loading && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Search queries scan unique handles. Contact books and telephone numbers are never accessed or stored.
          </p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-white/[0.04]">
          {query.trim().length >= 2 && results.length === 0 && !loading && (
            <div className="text-center py-10 text-slate-400 text-xs">
              No discoverable user found with handle <span className="font-mono text-emerald-400">@{query}</span>.
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="text-center py-10 text-slate-500 text-xs font-mono">
              Type at least 2 characters to search for users.
            </div>
          )}

          {results.map((prof) => {
            const hasSent = sentRequests.has(prof.id);
            return (
              <div key={prof.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={prof.display_name} avatarUrl={prof.avatar_url} size="md" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {prof.display_name}
                    </div>
                    <div className="text-xs font-mono text-emerald-400 truncate font-medium">
                      @{prof.username}
                    </div>
                    {prof.bio && (
                      <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                        {prof.bio}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleSendRequest(prof.id)}
                  disabled={hasSent}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    hasSent
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 cursor-default'
                      : 'btn-primary shadow-sm'
                  }`}
                >
                  {hasSent ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Sent</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Request</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
