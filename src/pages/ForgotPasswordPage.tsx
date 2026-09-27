// ==============================================================================
// SecureTalk Forgot Password Page
// Sends password recovery instructions via Supabase Auth
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, AlertCircle, CheckCircle, Loader2, Clock, Info } from 'lucide-react';
import { Logo } from '../components/Logo';
import { authService } from '../services/authService';
import { sanitizeErrorMessage } from '../utils/errors';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Active countdown timer to prevent hitting rate limits
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cooldown > 0 || loading || !email.trim()) return;
    setError(null);

    try {
      setLoading(true);
      await authService.forgotPassword(email.trim());
      setSuccess(true);
      setCooldown(60);
    } catch (err: unknown) {
      const sanitized = sanitizeErrorMessage(err);
      setError(sanitized);

      const isRateLimit =
        sanitized.includes('Rate limit') ||
        sanitized.includes('60 seconds') ||
        (typeof err === 'object' && err !== null && (err as { status?: number }).status === 429);

      if (isRateLimit) {
        setCooldown(60);
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
            Reset Account Password
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Enter your registered email to receive an authenticated recovery link.
          </p>
        </div>

        <div className="glass-card shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span>{error}</span>
                {cooldown > 0 && (
                  <p className="text-[11px] text-rose-400/80 font-mono">
                    Retry available in {cooldown}s.
                  </p>
                )}
              </div>
            </div>
          )}

          {success ? (
            <div className="text-center space-y-4 py-3">
              <div className="w-12 h-12 bg-emerald-950/80 border border-emerald-800/60 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/50">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-semibold text-white">Recovery Email Dispatched</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                If an account exists for <span className="font-mono text-emerald-400 font-semibold">{email}</span>, you will receive a password reset link shortly.
              </p>

              <div className="p-3.5 rounded-xl bg-[#080d16] border border-white/[0.06] text-left text-xs text-slate-400 space-y-1.5 shadow-inner">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span>Important Delivery Note</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Supabase enforces a strict 60-second cooldown between recovery emails. Check your spam/junk folder if the link does not appear immediately.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={loading || cooldown > 0}
                  className="btn-secondary w-full sm:w-auto text-xs px-4 py-2 inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}</span>
                </button>
                <Link to="/login" className="btn-primary w-full sm:w-auto text-xs px-4 py-2 inline-flex items-center justify-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Login</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="reset-email">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    required
                    disabled={loading}
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="btn-primary w-full py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-950/40"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Recovery Link...</span>
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span>Wait {cooldown}s to Resend</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Email</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link to="/login" className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1.5 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
