// ==============================================================================
// SecureTalk Privacy Settings Page
// Granular privacy toggles for receipts, typing, presence, and blocked users
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Check,
  UserX,
  AlertCircle,
  Eye,
  MessageSquare,
  Search,
  Loader2,
  Shield,
  Activity,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/userService';
import { UserAvatar } from '../components/UserAvatar';
import { sanitizeErrorMessage } from '../utils/errors';
import type { BlockedUser } from '../types/database';

export const PrivacySettingsPage: React.FC = () => {
  const { user, settings, refreshSettings } = useAuth();
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [lastSeen, setLastSeen] = useState(true);
  const [profileDiscoverable, setProfileDiscoverable] = useState(true);
  const [allowChatRequests, setAllowChatRequests] = useState(true);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);

  useEffect(() => {
    if (settings) {
      setReadReceipts(settings.read_receipts);
      setTypingIndicators(settings.typing_indicators);
      setOnlineStatus(settings.online_status);
      setLastSeen(settings.last_seen);
      setProfileDiscoverable(settings.profile_discoverable);
      setAllowChatRequests(settings.allow_chat_requests);
    }
  }, [settings]);

  useEffect(() => {
    if (!user) return;
    userService
      .getBlockedUsers(user.id)
      .then((users) => setBlockedUsers(users))
      .catch((err) => console.error('Failed to load blocked users:', err))
      .finally(() => setLoadingBlocked(false));
  }, [user]);

  const handleToggle = async (key: string, value: boolean) => {
    if (!user) return;
    try {
      setSaving(true);
      setError(null);
      await userService.updateUserSettings(user.id, { [key]: value });
      await refreshSettings();
      setSuccess('Privacy setting updated.');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (targetUserId: string) => {
    if (!user) return;
    try {
      await userService.unblockUser(user.id, targetUserId);
      setBlockedUsers((prev) => prev.filter((b) => b.blocked_id !== targetUserId));
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    }
  };

  // Modern Toggle Switch Component
  const ToggleSwitch: React.FC<{
    enabled: boolean;
    onChange: (val: boolean) => void;
    label: string;
  }> = ({ enabled, onChange, label }) => (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
      disabled={saving}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40' : 'bg-slate-700/60'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2.5 shadow-sm animate-in fade-in duration-150">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Toggles Card */}
      <div className="card space-y-5">
        <div className="border-b border-white/[0.07] pb-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Messaging & Presence Privacy</span>
            </h2>
            <span className="badge-e2ee text-[10px]">Zero Leakage</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Configure how your activity and interaction metadata is shared with other users.
          </p>
        </div>

        <div className="divide-y divide-white/[0.05] space-y-4">
          {/* Read Receipts */}
          <div className="pt-4 first:pt-0 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-200">Read Receipts</div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Let contacts know when you have read their encrypted messages.
              </p>
            </div>
            <ToggleSwitch
              enabled={readReceipts}
              onChange={(val) => {
                setReadReceipts(val);
                handleToggle('read_receipts', val);
              }}
              label="Read receipts toggle"
            />
          </div>

          {/* Typing Indicators */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-200">Typing Indicators</div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Broadcast ephemeral typing events over the WebSocket channel.
              </p>
            </div>
            <ToggleSwitch
              enabled={typingIndicators}
              onChange={(val) => {
                setTypingIndicators(val);
                handleToggle('typing_indicators', val);
              }}
              label="Typing indicators toggle"
            />
          </div>

          {/* Online Status */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-200">Online Status</div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Allow active conversation partners to see when you are currently online.
              </p>
            </div>
            <ToggleSwitch
              enabled={onlineStatus}
              onChange={(val) => {
                setOnlineStatus(val);
                handleToggle('online_status', val);
              }}
              label="Online status toggle"
            />
          </div>

          {/* Last Seen */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-200">Last Seen Timestamp</div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Permit contacts to view the approximate timestamp of your last activity.
              </p>
            </div>
            <ToggleSwitch
              enabled={lastSeen}
              onChange={(val) => {
                setLastSeen(val);
                handleToggle('last_seen', val);
              }}
              label="Last seen toggle"
            />
          </div>

          {/* Profile Discoverability */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-200">Search Discoverability</div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Allow other users to discover your @username when searching.
              </p>
            </div>
            <ToggleSwitch
              enabled={profileDiscoverable}
              onChange={(val) => {
                setProfileDiscoverable(val);
                handleToggle('profile_discoverable', val);
              }}
              label="Search discoverability toggle"
            />
          </div>

          {/* Allow Chat Requests */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-200">Accept Chat Requests</div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Receive incoming chat requests from users who are not yet in your contacts.
              </p>
            </div>
            <ToggleSwitch
              enabled={allowChatRequests}
              onChange={(val) => {
                setAllowChatRequests(val);
                handleToggle('allow_chat_requests', val);
              }}
              label="Chat requests toggle"
            />
          </div>
        </div>
      </div>

      {/* Blocked Users Section */}
      <div className="card space-y-4">
        <div className="border-b border-white/[0.07] pb-3.5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <UserX className="w-4 h-4 text-rose-400" />
            <span>Blocked Users ({blockedUsers.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Blocked handles cannot send chat requests or message you.
          </p>
        </div>

        {loadingBlocked ? (
          <div className="py-8 flex justify-center text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No blocked users on your account.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05] space-y-3">
            {blockedUsers.map((b) => (
              <div
                key={b.blocked_id}
                className="pt-3 first:pt-0 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={b.profile?.display_name || '?'}
                    avatarUrl={b.profile?.avatar_url}
                    size="sm"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      {b.profile?.display_name || 'User'}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-400">
                      @{b.profile?.username || b.blocked_id.slice(0, 8)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleUnblock(b.blocked_id)}
                  className="btn-secondary text-[11px] py-1 px-3 text-slate-300 hover:text-white"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
