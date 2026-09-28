// ==============================================================================
// SecureTalk Verify Email Page
// Informs user about email confirmation link & offers resend functionality
// ==============================================================================

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, ArrowRight, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Logo } from '../components/Logo';
import { authService } from '../services/authService';
import { sanitizeErrorMessage } from '../utils/errors';

export const VerifyEmailPage: React.FC = () => {
  const location = useLocation();
  const emailFromState = (location.state as { email?: string })?.email || '';
  const [email, setEmail] = useState(emailFromState);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setResendError('Please enter your email address.');
      return;
    }

    try {
      setResending(true);
      setResendError(null);
      setResendSuccess(false);
      await authService.resendConfirmation(email);
      setResendSuccess(true);
    } catch (err) {
      setResendError(sanitizeErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#080b11] text-slate-100 relative overflow-hidden select-none">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 text-center">
        <Logo size="lg" className="justify-center mb-6" />

        <div className="glass-card shadow-2xl p-8 space-y-6 text-left">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
            <Mail className="w-7 h-7" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Check your email
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              We sent a verification link to{' '}
              <span className="text-emerald-400 font-medium">
                {email || 'your registered email address'}
              </span>
              . Click the link in your inbox to confirm your account and start messaging securely.
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-300 flex items-start gap-2.5 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed text-[11px] text-slate-400">
              Your cryptographic identity keys are already generated locally on this device. Once verified, you can immediately begin end-to-end encrypted chats.
            </span>
          </div>

          {resendSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Confirmation email sent! Please check your spam folder if not visible in inbox.</span>
            </div>
          )}

          {resendError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{resendError}</span>
            </div>
          )}

          <form onSubmit={handleResend} className="space-y-3 pt-2">
            {!emailFromState && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1" htmlFor="resend-email">
                  Enter your email to resend
                </label>
                <input
                  id="resend-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field w-full text-xs py-2"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={resending}
              className="btn-secondary w-full py-2.5 text-xs inline-flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              <span>{resending ? 'Sending...' : 'Resend confirmation email'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80">
            <Link
              to="/login"
              className="btn-primary w-full py-2.5 text-xs inline-flex items-center justify-center gap-2 font-medium"
            >
              <span>Back to Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
