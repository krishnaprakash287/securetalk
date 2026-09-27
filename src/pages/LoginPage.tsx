// ==============================================================================
// SecureTalk Login Page
// Authenticates with Supabase and unlocks the local cryptographic keystore
// ==============================================================================

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../components/Logo';
import { authService } from '../services/authService';
import { sanitizeErrorMessage } from '../utils/errors';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/chats';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      await authService.login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#080b11] text-slate-100 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[250px] bg-teal-500/5 rounded-full blur-[90px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Logo size="lg" className="justify-center mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Enter your credentials to unlock your device's cryptographic keystore.
          </p>
        </div>

        <div className="glass-card shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="login-email">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  required
                  className="input-field pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300" htmlFor="login-password">
                  Account Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="input-field pl-10 pr-10"
                  autoComplete="current-password"
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

            <div className="p-3 bg-[#080d16] border border-white/[0.06] rounded-lg text-[11px] text-slate-400 flex items-center gap-2.5 shadow-inner">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Client-side Web Crypto session unlocks without transmitting private keys.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm mt-2 shadow-lg shadow-emerald-950/40"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Unlocking Keystore...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/[0.06] text-center text-xs text-slate-400">
            Don't have a SecureTalk handle?{' '}
            <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
