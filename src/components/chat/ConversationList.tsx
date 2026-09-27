// ==============================================================================
// SecureTalk Conversation List Component
// Displays active E2EE conversations with preview, unread badge, and filter
// ==============================================================================

import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, UserPlus, MessageSquare, Lock, Settings, X, ShieldCheck } from 'lucide-react';
import { UserAvatar } from '../UserAvatar';
import { useAuth } from '../../context/AuthContext';
import type { ConversationWithDetails } from '../../types/database';

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  loading: boolean;
  onOpenSearch: () => void;
  pendingRequestsCount: number;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  loading,
  onOpenSearch,
  pendingRequestsCount,
}) => {
  const { conversationId } = useParams();
  const { user, profile } = useAuth();
  const [filterQuery, setFilterQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');

  const currentUsername =
    profile?.username || (user?.user_metadata?.username as string) || user?.email?.split('@')[0] || 'user';
  const currentDisplayName =
    profile?.display_name || (user?.user_metadata?.display_name as string) || currentUsername;

  const filteredConversations = conversations.filter((c) => {
    if (filterTab === 'unread' && c.unreadCount === 0) return false;
    const q = filterQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.otherMember.display_name.toLowerCase().includes(q) ||
      c.otherMember.username.toLowerCase().includes(q) ||
      (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] border-r border-white/[0.07] w-full md:w-80 lg:w-96 flex-shrink-0 select-none">
      {/* Header & Search Bar */}
      <div className="p-3.5 border-b border-white/[0.07] space-y-3 bg-[#0c111c]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Chats</span>
              <span className="text-[11px] font-mono text-slate-400 font-normal">
                ({conversations.length})
              </span>
            </h1>
            <span className="badge-e2ee text-[9px]">E2EE</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenSearch}
              className="p-1.5 text-slate-300 hover:text-white bg-[#121826] hover:bg-[#1a2338] rounded-lg transition-colors border border-white/[0.08]"
              title="Find user by @username to start encrypted chat"
              aria-label="New chat request"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8.5 pr-8 py-1.5 bg-[#0f1522] border border-white/[0.08] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 transition-all shadow-inner"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1 pt-0.5">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              filterTab === 'all'
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Chats
          </button>
          <button
            onClick={() => setFilterTab('unread')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
              filterTab === 'unread'
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Unread</span>
            {conversations.some((c) => c.unreadCount > 0) && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        {/* Pending Requests Banner */}
        {pendingRequestsCount > 0 && (
          <Link
            to="/requests"
            className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 hover:bg-emerald-900/40 transition-all shadow-sm"
          >
            <span className="flex items-center gap-2 font-medium">
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pending Chat Requests</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500 text-slate-950 rounded-full shadow-sm">
              {pendingRequestsCount}
            </span>
          </Link>
        )}
      </div>

      {/* Conversations Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
        {loading && conversations.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500 font-mono animate-pulse">
            Decrypting conversations...
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="p-8 text-center text-slate-400 space-y-3.5">
            <div className="w-11 h-11 rounded-full bg-[#121826] flex items-center justify-center mx-auto text-slate-500 border border-white/[0.08]">
              <MessageSquare className="w-5 h-5 text-emerald-500/70" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">No active conversations</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                Connect with contacts by searching their unique <span className="font-mono text-emerald-400">@username</span> handle.
              </p>
            </div>
            <button
              onClick={onOpenSearch}
              className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Start New Conversation</span>
            </button>
          </div>
        )}

        {filteredConversations.map((conv) => {
          const isSelected = conv.id === conversationId;
          const partner = conv.otherMember;

          return (
            <Link
              key={conv.id}
              to={`/chat/${conv.id}`}
              className={`flex items-center gap-3 p-3 transition-all relative ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-950/40 via-[#101726] to-[#0c111c] border-l-2 border-emerald-500'
                  : 'hover:bg-white/[0.03]'
              }`}
            >
              <UserAvatar name={partner.display_name} avatarUrl={partner.avatar_url} size="md" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {partner.display_name}
                  </span>
                  {conv.lastMessage && (
                    <span className="text-[10px] text-slate-500 flex-shrink-0 font-mono">
                      {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-emerald-400/90 truncate mr-2">
                    @{partner.username}
                  </span>

                  {conv.unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-emerald-500 text-slate-950 rounded-full flex-shrink-0 shadow-sm shadow-emerald-500/30">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>

                {conv.lastMessage && (
                  <p className="text-xs text-slate-400 truncate mt-1">
                    {conv.lastMessage.text}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Authenticated User Identity Session Card */}
      <div className="p-3 bg-[#080c14] border-t border-white/[0.08] space-y-2.5">
        <div className="flex items-center justify-between">
          <Link
            to={`/profile/${currentUsername}`}
            className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition-opacity group flex-1 mr-2"
            title="View your public profile"
          >
            <UserAvatar name={currentDisplayName} avatarUrl={profile?.avatar_url} size="md" online={true} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-emerald-400 transition-colors leading-tight">
                {currentDisplayName}
              </div>
              <div className="text-[11px] font-mono text-emerald-400 truncate leading-tight font-medium">
                @{currentUsername}
              </div>
            </div>
          </Link>

          <Link
            to="/settings"
            className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.07] rounded-lg transition-colors"
            title="Settings & Keystore"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Lock className="w-3 h-3" />
            <span>Keystore Active</span>
          </span>
          <span className="text-slate-500">ECDH + AES-256</span>
        </div>
      </div>
    </div>
  );
};
