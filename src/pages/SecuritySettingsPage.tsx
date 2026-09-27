// ==============================================================================
// SecureTalk Security & Keystore Settings Page
// Manages client-side keys, password change, public fingerprint, and account deletion
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Loader2,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { getIdentityKeyRecord, exportPublicKeyJwk, wipeEntireKeystore } from '../crypto';
import { sanitizeErrorMessage } from '../utils/errors';
import { validatePassword } from '../utils/validation';

export const SecuritySettingsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [publicKeyBase64, setPublicKeyBase64] = useState<string>('Loading...');
  const [publicJwk, setPublicJwk] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Change Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getIdentityKeyRecord(user.id).then(async (rec) => {
      if (rec?.publicKey) {
        setPublicKeyBase64(rec.publicKeyBase64 || 'Active');
        try {
          const jwk = await exportPublicKeyJwk(rec.publicKey);
          setPublicJwk(JSON.stringify(jwk, null, 2));
        } catch {
          // Non-fatal
        }
      }
    });
  }, [user]);

  const handleCopyPublicKey = () => {
    navigator.clipboard.writeText(publicKeyBase64);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleWipeLocalCache = async () => {
    const confirmWipe = window.confirm(
      'This will clear derived conversation keys from local IndexedDB cache. They will be re-derived seamlessly upon next message. Proceed?'
    );
    if (!confirmWipe) return;

    try {
      await wipeEntireKeystore();
      alert('Local key cache refreshed.');
      window.location.reload();
    } catch (err) {
      alert('Error clearing cache.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmationInput !== profile?.username) return;

    try {
      setDeleting(true);
      setError(null);
      await authService.deleteAccount(user.id);
      navigate('/');
    } catch (err) {
      setError(sanitizeErrorMessage(err));
      setDeleting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    const passVal = validatePassword(newPassword);
    if (!passVal.valid) {
      setPasswordError(passVal.error || 'Password does not meet security criteria.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      await authService.resetPassword(newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPasswordError(sanitizeErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Keystore Status */}
      <div className="card space-y-4">
        <div className="border-b border-white/[0.07] pb-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Local Cryptographic Keystore</span>
            </h2>
            <span className="badge-e2ee text-[10px]">Non-Extractable</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Your private key is generated and stored locally in browser IndexedDB. It never touches any remote network.
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3.5 bg-[#090d15] border border-white/[0.06] rounded-xl shadow-inner">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-200 block">Identity Algorithm</span>
              <span className="text-slate-400 font-mono text-[11px]">ECDH P-256 (NIST secp256r1)</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50 rounded-md">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#090d15] border border-white/[0.06] rounded-xl shadow-inner">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-200 block">Symmetric Cipher</span>
              <span className="text-slate-400 font-mono text-[11px]">AES-256-GCM (128-bit Authentication Tag)</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50 rounded-md">
              Active
            </span>
          </div>

          <div className="p-3.5 bg-[#090d15] border border-white/[0.06] rounded-xl space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Public Key Fingerprint (SPKI Base64)</span>
              <button
                onClick={handleCopyPublicKey}
                className="btn-secondary text-[11px] py-1 px-3 flex items-center gap-1.5"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="font-mono text-[10px] text-slate-400 break-all select-all bg-black/40 p-2.5 rounded-lg border border-white/[0.06] leading-relaxed">
              {publicKeyBase64}
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <button
            onClick={handleWipeLocalCache}
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 text-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Local Session Cache</span>
          </button>
        </div>
      </div>

      {/* Account Password Management */}
      <div className="card space-y-4">
        <div className="border-b border-white/[0.07] pb-3.5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>Change Account Password</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Update your account password directly. Your local end-to-end encryption keys and chats remain preserved.
          </p>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2.5 shadow-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Password successfully updated.</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2.5 shadow-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="settings-new-password">
              New Password <span className="text-slate-500 font-normal">(Min 8 chars, letter + number)</span>
            </label>
            <div className="relative">
              <input
                id="settings-new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="input-field pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="settings-confirm-password">
              Confirm New Password
            </label>
            <input
              id="settings-confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="input-field"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={changingPassword || !newPassword || !confirmNewPassword}
            className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-2 shadow-md shadow-emerald-950/40"
          >
            {changingPassword ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </form>
      </div>

      {/* Account Deletion Section */}
      <div className="card border-rose-900/40 bg-rose-950/10 space-y-4">
        <div className="border-b border-rose-900/30 pb-3.5">
          <h2 className="text-sm font-bold text-rose-300 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Danger Zone: Delete Account</span>
          </h2>
          <p className="text-xs text-rose-200/70 mt-1 leading-relaxed">
            Permanently delete your profile, public keys, active sessions, and wipe local cryptographic keys.
          </p>
        </div>

        <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
          <p>When you delete your account:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
            <li>Your public profile (@{profile?.username}) and public keys will be immediately deleted.</li>
            <li>Your conversation memberships and active sessions will be terminated.</li>
            <li>Your local cryptographic identity key will be permanently wiped from this browser.</li>
            <li>
              Existing encrypted message ciphertexts in partner devices will remain undecryptable
              by third parties.
            </li>
          </ul>
        </div>

        <button
          onClick={() => setDeleteModalOpen(true)}
          className="btn-danger text-xs py-2 px-4 shadow-sm"
        >
          <span>Request Permanent Account Deletion</span>
        </button>
      </div>

      {/* Deletion Confirmation Modal */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#0e1422] border border-rose-800/60 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-bold text-base text-white">Confirm Account Deletion</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action cannot be undone. To permanently delete your account, type your username{' '}
              <span className="font-mono text-rose-400 font-semibold">@{profile?.username}</span> below:
            </p>

            <input
              type="text"
              value={deleteConfirmationInput}
              onChange={(e) => setDeleteConfirmationInput(e.target.value)}
              placeholder={profile?.username}
              className="input-field font-mono text-xs border-rose-900/60 focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="btn-secondary text-xs px-3.5 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmationInput !== profile?.username}
                className="btn-danger text-xs py-2 px-4"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete My Account</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
