// ==============================================================================
// SecureTalk Reset Password Page
// Sets new account password after user clicks recovery link
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, AlertCircle, CheckCircle, Loader2, Info, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../components/Logo';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';
import { validatePassword } from '../utils/validation';
import { sanitizeErrorMessage } from '../utils/errors';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const hash = window.location.hash;
      const search = window.location.search;
      const hasTokenInUrl =
        hash.includes('access_token') ||
        hash.includes('type=recovery') ||
        search.includes('code=');

      const { data: { session } } = await supabase.auth.getSession();
      setHasValidSession(Boolean(session || hasTokenInUrl));
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || Boolean(session)) {
        setHasValidSession(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const passVal = validatePassword(password);
    if (!passVal.valid) {
      setError(passVal.error || 'Password does not meet security criteria.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await authService.resetPassword(password);
      setSuccess(true);
      setTimeout(() => navigate('/chats'), 2000);
    } catch (err: unknown) {
      const msg = sanitizeErrorMessage(err);
      if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('auth')) {
        setError('No active recovery session found. Please request a new password reset email.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#080b11] text-slate-100 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Logo size="lg" className="justify-center mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Set New Password
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Choose a strong password to protect your account.
          </p>
        </div>

        <div className="glass-card shadow-2xl">
          {hasValidSession === false && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs flex items-start gap-2.5 shadow-inner">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Need a password reset link?</span>
                <span className="text-amber-200/80 leading-relaxed block text-[11px]">
                  If you forgot your password, please{' '}
                  <Link to="/forgot-password" className="underline font-semibold hover:text-amber-100">
                    request a recovery email
                  </Link>{' '}
                  to generate an authenticated reset link. If you are already logged in, you can update your password directly in{' '}
                  <Link to="/settings/security" className="underline font-semibold hover:text-amber-100">
                    Settings &gt; Security
                  </Link>
                  .
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 bg-emerald-950/80 border border-emerald-800/60 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/50">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-semibold text-white">Password Updated Successfully</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your password has been securely changed. Redirecting to your conversations...
              </p>
              <Link to="/chats" className="btn-primary text-xs px-5 py-2.5 inline-flex items-center gap-2 mt-2 shadow-md shadow-emerald-950/40">
                <span>Go to Conversations</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="new-password">
                  New Password <span className="text-slate-500 font-normal">(Min 8 chars, letter + number)</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="input-field pl-10 pr-10"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="new-confirm-password">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="new-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="input-field pl-10"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 text-sm shadow-lg shadow-emerald-950/40"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save New Password</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              <div className="pt-3 text-center flex items-center justify-center gap-4 text-xs text-slate-400">
                <Link to="/login" className="hover:text-slate-200 inline-flex items-center gap-1.5 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to login</span>
                </Link>
                <span>•</span>
                <Link to="/forgot-password" className="hover:text-slate-200 transition-colors">
                  Request reset email
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
