// ==============================================================================
// SecureTalk Chat Header Component
// Shows partner identity, presence status, safety verification, and privacy options
// ==============================================================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Search,
  MoreVertical,
  UserX,
  User,
  Lock,
} from 'lucide-react';
import { UserAvatar } from '../UserAvatar';
import { SafetyNumberModal } from '../SafetyNumberModal';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import type { Profile } from '../../types/database';

interface ChatHeaderProps {
  partner: Profile;
  isOnline?: boolean;
  onToggleSearch: () => void;
  isSearching: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  partner,
  isOnline = false,
  onToggleSearch,
  isSearching,
}) => {
  const { user } = useAuth();
  const { refreshConversations } = useChat();
  const navigate = useNavigate();
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const handleBlockUser = async () => {
    if (!user) return;
    const confirmBlock = window.confirm(
      `Are you sure you want to block @${partner.username}? They will no longer be able to message you.`
    );
    if (!confirmBlock) return;

    try {
      setBlocking(true);
      await userService.blockUser(user.id, partner.id);
      await refreshConversations();
      navigate('/chats');
    } catch (err) {
      alert('Failed to block user. Please try again.');
    } finally {
      setBlocking(false);
    }
  };

  return (
    <>
      <div className="h-16 px-4 bg-[#0a0e17]/90 backdrop-blur-md border-b border-white/[0.07] flex items-center justify-between z-10 select-none shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <Link
            to="/chats"
            className="md:hidden p-2 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <Link
            to={`/profile/${partner.username}`}
            className="flex items-center gap-3 min-w-0 group"
          >
            <UserAvatar
              name={partner.display_name}
              avatarUrl={partner.avatar_url}
              size="md"
              online={isOnline}
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors truncate leading-tight">
                {partner.display_name}
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                <span className="text-emerald-400">@{partner.username}</span>
                <span className="text-slate-600">•</span>
                <span className={isOnline ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Safety Number Fingerprint Button */}
          <button
            onClick={() => setShowSafetyModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111726] hover:bg-[#182033] border border-white/[0.08] hover:border-emerald-500/40 text-xs text-slate-300 hover:text-white transition-all shadow-sm"
            title="Verify end-to-end cryptographic safety numbers"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[11px]">Verify Keys</span>
          </button>

          {/* Search in Chat Button */}
          <button
            onClick={onToggleSearch}
            className={`p-2 rounded-lg transition-colors border ${
              isSearching
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border-transparent'
            }`}
            title="Search decrypted messages locally"
            aria-label="Search conversation"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Options Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
              title="More actions"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-52 bg-[#0e1422] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 space-y-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                role="menu"
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowSafetyModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                  role="menuitem"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verify Safety Numbers</span>
                </button>

                <Link
                  to={`/profile/${partner.username}`}
                  onClick={() => setShowMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                  role="menuitem"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>View Public Profile</span>
                </Link>

                <div className="border-t border-white/[0.06] my-1" />

                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleBlockUser();
                  }}
                  disabled={blocking}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors"
                  role="menuitem"
                >
                  <UserX className="w-4 h-4" />
                  <span>{blocking ? 'Blocking...' : `Block @${partner.username}`}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Safety Number Verification Modal */}
      {showSafetyModal && (
        <SafetyNumberModal
          partner={partner}
          onClose={() => setShowSafetyModal(false)}
        />
      )}
    </>
  );
};
