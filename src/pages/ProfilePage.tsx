// ==============================================================================
// SecureTalk User Profile Page
// Privacy-first profile viewing and editing. Strictly omits email and private keys.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  MessageSquare,
  UserPlus,
  UserX,
  Edit2,
  Check,
  AlertCircle,
  Loader2,
  Calendar,
  Lock,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { UserAvatar } from '../components/UserAvatar';
import { SafetyNumberModal } from '../components/SafetyNumberModal';
import { userService } from '../services/userService';
import { chatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { sanitizeErrorMessage } from '../utils/errors';
import type { Profile } from '../types/database';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user, profile: myProfile, refreshProfile } = useAuth();
  const { conversations, refreshRequestsCount } = useChat();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Action states
  const [requestSent, setRequestSent] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  const isMe = user && myProfile && username?.toLowerCase() === myProfile.username.toLowerCase();

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);

    userService
      .getProfileByUsername(username)
      .then((p) => {
        setProfile(p);
        if (p) {
          setEditDisplayName(p.display_name);
          setEditBio(p.bio || '');
          setEditAvatarUrl(p.avatar_url || '');
        }
      })
      .catch((err) => setError(sanitizeErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [username]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setError(null);
      await userService.updateProfile(user.id, {
        display_name: editDisplayName.trim() || profile?.username,
        bio: editBio.trim() || null,
        avatar_url: editAvatarUrl.trim() || null,
      });

      await refreshProfile();
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              display_name: editDisplayName.trim() || prev.username,
              bio: editBio.trim() || null,
              avatar_url: editAvatarUrl.trim() || null,
            }
          : null
      );

      setIsEditing(false);
      setSuccess('Profile updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSendChatRequest = async () => {
    if (!user || !profile) return;
    try {
      setError(null);
      await chatService.sendChatRequest(user.id, profile.id);
      setRequestSent(true);
      await refreshRequestsCount();
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    }
  };

  const handleBlockUser = async () => {
    if (!user || !profile) return;
    const confirm = window.confirm(`Are you sure you want to block @${profile.username}?`);
    if (!confirm) return;

    try {
      await userService.blockUser(user.id, profile.id);
      navigate('/chats');
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    }
  };

  // Check if existing conversation exists
  const existingConv = profile
    ? conversations.find((c) => c.otherMember.id === profile.id)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#080b11] text-slate-100 select-none">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="text-xs font-mono">Loading profile...</span>
          </div>
        ) : error && !profile ? (
          <div className="card text-center py-12 space-y-3">
            <p className="text-slate-400 text-sm">User @{username} not found or profile is hidden.</p>
            <button onClick={() => navigate(-1)} className="btn-secondary text-xs px-4 py-2">
              Go Back
            </button>
          </div>
        ) : profile ? (
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

            {/* Profile Card */}
            <div className="card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.07]">
                <div className="flex items-center gap-4">
                  <UserAvatar
                    name={profile.display_name}
                    avatarUrl={profile.avatar_url}
                    size="xl"
                  />
                  <div>
                    <h1 className="text-xl font-bold text-white">
                      {profile.display_name}
                    </h1>
                    <div className="font-mono text-xs text-emerald-400 font-semibold mt-0.5">
                      @{profile.username}
                    </div>
                  </div>
                </div>

                {isMe && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-secondary text-xs px-3.5 py-2 self-start sm:self-auto flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                /* Edit Profile Form */
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      required
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Avatar URL <span className="text-slate-500 font-normal">(HTTPS image link)</span>
                    </label>
                    <input
                      type="url"
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Bio <span className="text-slate-500 font-normal">(Max 160 chars)</span>
                    </label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      maxLength={160}
                      rows={3}
                      placeholder="Share a short privacy-safe status..."
                      className="input-field resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary text-xs py-2 px-4 shadow-sm"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn-secondary text-xs py-2 px-4"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Profile Details Display */
                <div className="space-y-4">
                  {profile.bio && (
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block mb-1">About</span>
                      <p className="text-sm text-slate-200 leading-relaxed bg-[#090d16] p-3 rounded-xl border border-white/[0.06]">
                        {profile.bio}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#090d16] border border-white/[0.06] rounded-xl flex items-center gap-2.5 text-slate-400">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>E2EE ECDH P-256 Enabled</span>
                    </div>

                    <div className="p-3 bg-[#090d16] border border-white/[0.06] rounded-xl flex items-center gap-2.5 text-slate-400">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span>Member since {new Date(profile.created_at).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Actions for Non-Self */}
                  {!isMe && (
                    <div className="pt-4 border-t border-white/[0.07] flex flex-wrap items-center gap-3">
                      {existingConv ? (
                        <button
                          onClick={() => navigate(`/chat/${existingConv.id}`)}
                          className="btn-primary text-xs py-2 px-4 flex items-center gap-2 shadow-md shadow-emerald-950/40"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Open Conversation</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleSendChatRequest}
                          disabled={requestSent}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            requestSent
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 cursor-default'
                              : 'btn-primary shadow-md shadow-emerald-950/40'
                          }`}
                        >
                          {requestSent ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Request Sent</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Send Chat Request</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => setShowSafetyModal(true)}
                        className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-2"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Safety Numbers</span>
                      </button>

                      <button
                        onClick={handleBlockUser}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors ml-auto border border-transparent hover:border-rose-900/40"
                        title="Block this user"
                        aria-label="Block user"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>

      {/* Safety Number Modal */}
      {showSafetyModal && profile && (
        <SafetyNumberModal
          partner={profile}
          onClose={() => setShowSafetyModal(false)}
        />
      )}
    </div>
  );
};
