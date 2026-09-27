// ==============================================================================
// SecureTalk Chat Requests Page
// Manages bilateral connection requests: Incoming, Outgoing, Accept/Reject/Block
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Check,
  X,
  UserX,
  Clock,
  ArrowRight,
  Shield,
  Loader2,
  AlertCircle,
  Inbox,
  Send,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { UserAvatar } from '../components/UserAvatar';
import { chatService } from '../services/chatService';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { sanitizeErrorMessage } from '../utils/errors';
import type { ChatRequest } from '../types/database';

export const RequestsPage: React.FC = () => {
  const { user } = useAuth();
  const { refreshConversations, refreshRequestsCount } = useChat();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [incoming, setIncoming] = useState<ChatRequest[]>([]);
  const [outgoing, setOutgoing] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const res = await chatService.getChatRequests(user.id);
      setIncoming(res.incoming);
      setOutgoing(res.outgoing);
      await refreshRequestsCount();
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [user]);

  const handleAccept = async (requestId: string) => {
    try {
      setActionLoadingId(requestId);
      const newConvId = await chatService.acceptChatRequest(requestId);
      await refreshConversations();
      await refreshRequestsCount();
      navigate(`/chat/${newConvId}`);
    } catch (err) {
      setError(sanitizeErrorMessage(err));
      setActionLoadingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setActionLoadingId(requestId);
      await chatService.rejectChatRequest(requestId);
      await loadRequests();
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!user) return;
    try {
      setActionLoadingId(requestId);
      await chatService.cancelChatRequest(requestId, user.id);
      await loadRequests();
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBlockSender = async (senderId: string, requestId: string) => {
    if (!user) return;
    const confirm = window.confirm('Are you sure you want to block this user? They will no longer be able to send requests or messages.');
    if (!confirm) return;

    try {
      setActionLoadingId(requestId);
      await userService.blockUser(user.id, senderId);
      await chatService.rejectChatRequest(requestId);
      await loadRequests();
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingIncoming = incoming.filter((r) => r.status === 'pending');
  const pastIncoming = incoming.filter((r) => r.status !== 'pending');

  return (
    <div className="min-h-screen flex flex-col bg-[#080b11] text-slate-100 select-none">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-white/[0.07]">
          <div>
            <div className="badge-e2ee mb-1 text-[10px]">Access Control</div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <UserPlus className="w-6 h-6 text-emerald-400" />
              <span>Chat Requests</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Control who can initiate end-to-end encrypted sessions with you.
            </p>
          </div>

          {/* Tab selector */}
          <div className="flex bg-[#0e1422] p-1 rounded-xl border border-white/[0.08] text-xs shadow-inner">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'incoming'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Incoming ({pendingIncoming.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === 'outgoing'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Outgoing ({outgoing.length})</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="text-xs font-mono">Fetching requests...</span>
          </div>
        ) : activeTab === 'incoming' ? (
          <div className="space-y-6">
            {/* Pending Requests Section */}
            <div>
              <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 font-semibold">
                Pending Requests ({pendingIncoming.length})
              </h2>

              {pendingIncoming.length === 0 ? (
                <div className="card text-center py-12 text-slate-400 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-[#121826] flex items-center justify-center mx-auto text-slate-500 border border-white/[0.08]">
                    <Inbox className="w-5 h-5 text-emerald-500/70" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200">No pending requests</p>
                  <p className="text-[11px] text-slate-500">You're all caught up with your chat requests.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingIncoming.map((req) => {
                    const sender = req.sender;
                    const isProcessing = actionLoadingId === req.id;

                    return (
                      <div
                        key={req.id}
                        className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
                      >
                        <div className="flex items-center gap-3.5">
                          <UserAvatar
                            name={sender?.display_name || '?'}
                            avatarUrl={sender?.avatar_url}
                            size="md"
                          />
                          <div>
                            <div className="text-sm font-bold text-white">
                              {sender?.display_name}
                            </div>
                            <div className="text-xs font-mono text-emerald-400 font-medium">
                              @{sender?.username}
                            </div>
                            {sender?.bio && (
                              <div className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                                {sender.bio}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleAccept(req.id)}
                            disabled={isProcessing}
                            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Accept</span>
                          </button>

                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={isProcessing}
                            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 text-slate-300 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>

                          {sender && (
                            <button
                              onClick={() => handleBlockSender(sender.id, req.id)}
                              disabled={isProcessing}
                              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40"
                              title="Block user"
                              aria-label="Block user"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Resolved History */}
            {pastIncoming.length > 0 && (
              <div className="pt-4 border-t border-white/[0.06]">
                <h2 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-3">
                  Past Incoming Requests ({pastIncoming.length})
                </h2>
                <div className="space-y-2 opacity-70">
                  {pastIncoming.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-[#0a0e17] border border-white/[0.05] rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-slate-300">
                          {req.sender?.display_name}
                        </span>
                        <span className="font-mono text-slate-500">
                          @{req.sender?.username}
                        </span>
                      </div>
                      <span className="badge-neutral text-[10px] capitalize">
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Outgoing Requests Tab */
          <div>
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 font-semibold">
              Outgoing Requests ({outgoing.length})
            </h2>

            {outgoing.length === 0 ? (
              <div className="card text-center py-12 text-slate-400 space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#121826] flex items-center justify-center mx-auto text-slate-500 border border-white/[0.08]">
                  <Send className="w-5 h-5 text-emerald-500/70" />
                </div>
                <p className="text-xs font-semibold text-slate-200">No outgoing requests</p>
                <p className="text-[11px] text-slate-500">
                  Search for peers using the top search bar to send an encrypted chat request.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {outgoing.map((req) => {
                  const recipient = req.recipient;
                  const isProcessing = actionLoadingId === req.id;

                  return (
                    <div
                      key={req.id}
                      className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
                    >
                      <div className="flex items-center gap-3.5">
                        <UserAvatar
                          name={recipient?.display_name || '?'}
                          avatarUrl={recipient?.avatar_url}
                          size="md"
                        />
                        <div>
                          <div className="text-sm font-bold text-white">
                            {recipient?.display_name}
                          </div>
                          <div className="text-xs font-mono text-emerald-400 font-medium">
                            @{recipient?.username}
                          </div>
                          {recipient?.bio && (
                            <div className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
                              {recipient.bio}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border ${
                            req.status === 'pending'
                              ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                              : req.status === 'accepted'
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                              : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
                          }`}
                        >
                          {req.status === 'pending' ? 'Pending Approval' : req.status}
                        </span>

                        {req.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            disabled={isProcessing}
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
