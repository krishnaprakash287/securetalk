// ==============================================================================
// SecureTalk Real-Time Encrypted Chats Page
// Responsive split view with live E2EE stream, typing broadcast, and attachments
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, MessageSquare, Loader2, Lock, UserPlus } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { UserAvatar } from '../components/UserAvatar';
import { ConversationList } from '../components/chat/ConversationList';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageItem } from '../components/chat/MessageItem';
import { MessageComposer } from '../components/chat/MessageComposer';
import { LocalMessageSearch } from '../components/chat/LocalMessageSearch';
import { UserSearchModal } from '../components/UserSearchModal';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { chatService } from '../services/chatService';
import { realtimeService } from '../services/realtimeService';
import { decryptMessage } from '../crypto';
import type { DecryptedMessage } from '../crypto/types';
import type { DbMessage, Profile } from '../types/database';

export const ChatsPage: React.FC = () => {
  const { conversationId } = useParams();
  const { user, profile, settings } = useAuth();
  const {
    conversations,
    loadingConversations,
    pendingRequestsCount,
    refreshConversations,
  } = useChat();

  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [partnerIsOnline, setPartnerIsOnline] = useState(false);
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DecryptedMessage | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<any>(null);

  const currentUsername =
    profile?.username || (user?.user_metadata?.username as string) || user?.email?.split('@')[0] || 'user';
  const currentDisplayName =
    profile?.display_name || (user?.user_metadata?.display_name as string) || currentUsername;

  // Find partner for current conversation
  useEffect(() => {
    if (!conversationId || conversations.length === 0) {
      setPartner(null);
      return;
    }
    const currentConv = conversations.find((c) => c.id === conversationId);
    if (currentConv) {
      setPartner(currentConv.otherMember);
    }
  }, [conversationId, conversations]);

  // Load and decrypt messages when conversation changes
  useEffect(() => {
    if (!conversationId || !user || !partner) return;

    let isMounted = true;
    setLoadingMessages(true);

    chatService
      .getMessages(conversationId, user.id, partner.id)
      .then((decrypted) => {
        if (isMounted) {
          setMessages(decrypted);
          // Mark messages as read if read receipts are enabled
          if (settings?.read_receipts) {
            chatService.markAsRead(conversationId, user.id);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load decrypted messages:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingMessages(false);
      });

    // Clean up previous realtime channel
    if (realtimeChannelRef.current) {
      realtimeService.unsubscribe(realtimeChannelRef.current);
    }

    // Set up Realtime subscription for this conversation
    const channel = realtimeService.subscribeToConversation(conversationId, user.id, {
      onNewMessage: async (newMsg: DbMessage) => {
        // If message is from partner, decrypt locally
        if (newMsg.sender_id !== user.id) {
          try {
            let convKey = await chatService.getConversationKey(user.id, conversationId, partner.id);
            let decryptedEnvelope: { text: string };
            try {
              decryptedEnvelope = await decryptMessage(newMsg, convKey);
            } catch {
              convKey = await chatService.rederiveConversationKey(user.id, conversationId, partner.id);
              decryptedEnvelope = await decryptMessage(newMsg, convKey);
            }

            setMessages((prev) => [
              ...prev,
              {
                id: newMsg.id,
                conversationId: newMsg.conversation_id,
                senderId: newMsg.sender_id,
                text: decryptedEnvelope.text,
                status: newMsg.status,
                replyToId: newMsg.reply_to_id,
                createdAt: newMsg.created_at,
                editedAt: newMsg.edited_at,
                deletedAt: newMsg.deleted_at,
                attachments: [],
              },
            ]);

            if (settings?.read_receipts) {
              await chatService.markAsRead(conversationId, user.id);
            }
          } catch (err) {
            console.error('Decryption failed on incoming realtime message:', err);
            setMessages((prev) => [
              ...prev,
              {
                id: newMsg.id,
                conversationId: newMsg.conversation_id,
                senderId: newMsg.sender_id,
                text: 'Decryption failed: cryptographic integrity check failed.',
                status: newMsg.status,
                replyToId: newMsg.reply_to_id,
                createdAt: newMsg.created_at,
                editedAt: newMsg.edited_at,
                deletedAt: newMsg.deleted_at,
                attachments: [],
              },
            ]);
          }
        }
        refreshConversations();
      },

      onMessageUpdate: (updatedMsg: DbMessage) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updatedMsg.id
              ? {
                  ...m,
                  status: updatedMsg.status,
                  deletedAt: updatedMsg.deleted_at,
                  text: updatedMsg.deleted_at ? 'This message was deleted.' : m.text,
                }
              : m
          )
        );
      },

      onTyping: (isTyping: boolean) => {
        setPartnerIsTyping(isTyping);
      },

      onPresenceUpdate: (onlineUserIds: string[]) => {
        setPartnerIsOnline(onlineUserIds.includes(partner.id));
      },
    });

    realtimeChannelRef.current = channel;

    // Track own presence if enabled
    if (settings?.online_status) {
      realtimeService.trackPresence(channel, user.id, true);
    }

    return () => {
      isMounted = false;
      if (realtimeChannelRef.current) {
        realtimeService.unsubscribe(realtimeChannelRef.current);
      }
    };
  }, [conversationId, user, partner, settings?.read_receipts, settings?.online_status, refreshConversations]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerIsTyping]);

  const handleSendMessage = async (text: string, file?: File | null) => {
    if (!conversationId || !user || !partner) return;

    if (file) {
      const newMsg = await chatService.sendEncryptedAttachment(
        conversationId,
        user.id,
        partner.id,
        file
      );
      setMessages((prev) => [...prev, newMsg]);
    } else if (text.trim()) {
      const newMsg = await chatService.sendMessage(
        conversationId,
        user.id,
        partner.id,
        text,
        replyingTo?.id
      );
      setMessages((prev) => [...prev, newMsg]);
    }

    refreshConversations();
  };

  const handleTyping = (isTyping: boolean) => {
    if (realtimeChannelRef.current && user && settings?.typing_indicators) {
      realtimeService.broadcastTyping(realtimeChannelRef.current, user.id, isTyping, true);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!user) return;
    try {
      await chatService.deleteMessage(msgId, user.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, deletedAt: new Date().toISOString(), text: 'This message was deleted.' } : m
        )
      );
    } catch {
      alert('Failed to delete message.');
    }
  };

  const handleSelectSearchResult = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-emerald-950/50');
      setTimeout(() => el.classList.remove('bg-emerald-950/50'), 2000);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0d14] text-slate-100 overflow-hidden">
      <Navbar onOpenSearch={() => setSearchModalOpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Conversation List (Hidden on mobile if a conversation is open) */}
        <div className={`h-full ${conversationId ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}>
          <ConversationList
            conversations={conversations}
            loading={loadingConversations}
            onOpenSearch={() => setSearchModalOpen(true)}
            pendingRequestsCount={pendingRequestsCount}
          />
        </div>

        {/* Right Area: Active Chat or Empty Placeholder */}
        <div className={`flex-1 flex flex-col h-full bg-[#080b11] ${!conversationId ? 'hidden md:flex' : 'flex'}`}>
          {conversationId && partner ? (
            <>
              {/* Chat Header */}
              <ChatHeader
                partner={partner}
                isOnline={partnerIsOnline}
                onToggleSearch={() => setIsSearching(!isSearching)}
                isSearching={isSearching}
              />

              {/* Local In-Memory Search Bar */}
              {isSearching && (
                <LocalMessageSearch
                  messages={messages}
                  onClose={() => setIsSearching(false)}
                  onSelectResult={handleSelectSearchResult}
                />
              )}

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-1">
                {/* Security Advisory Pill */}
                <div className="my-3 text-center">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#0e1422]/90 border border-white/[0.08] rounded-full text-xs text-slate-300 font-mono shadow-sm">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>End-to-end encrypted with @{partner.username}</span>
                  </div>
                </div>

                {loadingMessages && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    <span className="text-xs text-slate-500 font-mono">Decrypting message store...</span>
                  </div>
                )}

                {!loadingMessages && messages.length === 0 && (
                  <div className="text-center py-20 text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#101726] border border-white/[0.08] flex items-center justify-center mx-auto text-emerald-400">
                      <Shield className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-200">End-to-End Encrypted Session Initialized</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      All messages exchanged with <span className="font-mono text-emerald-400 font-medium">@{partner.username}</span> are encrypted with AES-256-GCM directly on your device.
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} id={`msg-${msg.id}`} className="transition-colors rounded">
                    <MessageItem
                      message={msg}
                      isMine={msg.senderId === user?.id}
                      onReply={(target) => setReplyingTo(target)}
                      onDelete={handleDeleteMessage}
                      currentUserId={user?.id || ''}
                      partnerId={partner.id}
                    />
                  </div>
                ))}

                {/* Partner Typing Indicator */}
                {partnerIsTyping && (
                  <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-400 animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 bg-[#101626] px-3 py-1.5 rounded-full border border-white/[0.08] shadow-sm">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      @{partner.username} is typing...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <MessageComposer
                onSendMessage={handleSendMessage}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                onTyping={handleTyping}
              />
            </>
          ) : (
            /* Modern Empty State when no conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#080b11] relative overflow-hidden">
              {/* Subtle ambient background glow */}
              <div className="absolute w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

              {/* User Identity Welcome Card */}
              <div className="relative glass-card max-w-sm w-full mb-6 text-left shadow-2xl">
                <div className="flex items-center gap-3.5 mb-4">
                  <UserAvatar name={currentDisplayName} avatarUrl={profile?.avatar_url} size="lg" online={true} />
                  <div className="min-w-0 flex-1">
                    <div className="badge-e2ee mb-1 text-[9px]">
                      Authenticated Keystore
                    </div>
                    <div className="text-base font-bold text-white truncate">{currentDisplayName}</div>
                    <div className="text-xs font-mono text-emerald-400 truncate font-medium">@{currentUsername}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#080c14]/90 border border-white/[0.08] text-xs text-slate-300 space-y-2 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Public Identity:</span>
                    <span className="font-mono text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md select-all">
                      @{currentUsername}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Key Exchange:</span>
                    <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
                      <Lock className="w-3 h-3" />
                      <span>ECDH P-256 (Local)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Cipher:</span>
                    <span className="font-mono text-[11px] text-slate-300">AES-256-GCM</span>
                  </div>
                </div>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-[#101726] border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-950/40">
                <Shield className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1.5 tracking-tight">
                Zero-Knowledge Encrypted Messaging
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                Connect with contacts securely. Share your handle <span className="font-mono text-emerald-400 font-semibold">@{currentUsername}</span> or discover peers to start private messaging.
              </p>
              <button
                onClick={() => setSearchModalOpen(true)}
                className="btn-primary text-xs px-5 py-2.5 inline-flex items-center gap-2 shadow-md shadow-emerald-950/50"
              >
                <UserPlus className="w-4 h-4" />
                <span>Start New Encrypted Conversation</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <UserSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </div>
  );
};
