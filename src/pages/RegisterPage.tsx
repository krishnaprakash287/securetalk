// ==============================================================================
// SecureTalk Registration Page
// Local key generation, username validation, and zero-knowledge setup
// ==============================================================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Mail, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Logo } from '../components/Logo';
import { authService } from '../services/authService';
import { validateUsername, validatePassword, validateEmail, normalizeUsername } from '../utils/validation';
import { sanitizeErrorMessage } from '../utils/errors';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validation checks
    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      setError(emailVal.error || 'Invalid email.');
      return;
    }

    const userVal = validateUsername(username);
    if (!userVal.valid) {
      setError(userVal.error || 'Invalid username.');
      return;
    }

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
      await authService.register({
        email,
        username,
        password,
        displayName: displayName.trim() || username,
      });

      // Navigate to chat
      navigate('/chats');
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#080b11] text-slate-100 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[110px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Logo size="lg" className="justify-center mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Create your account
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Keys are created locally via Web Crypto. No phone number required.
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
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="reg-email">
                Email Address <span className="text-slate-500 font-normal">(Private for account recovery)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-email"
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

            {/* Username Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300" htmlFor="reg-username">
                  Unique Username
                </label>
                <span className="text-[10px] text-slate-500 font-mono">3–30 chars, lowercase</span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">
                  @
                </span>
                <input
                  id="reg-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                  placeholder="krishna_dev"
                  required
                  className="input-field pl-9 font-mono text-xs"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Display Name Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="reg-display-name">
                Display Name <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Krishna"
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="reg-password">
                Password <span className="text-slate-500 font-normal">(Min 8 chars, letter + number)</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-password"
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

            {/* Confirm Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="reg-confirm-password">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-confirm-password"
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

            {/* Security Guarantee Notice */}
            <div className="p-3.5 bg-[#080d16] border border-white/[0.06] rounded-xl text-xs text-slate-400 space-y-1.5 shadow-inner">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Shield className="w-4 h-4" />
                <span>Zero-Knowledge Key Generation</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ECDH P-256 keys are generated locally in your browser. Your private key stays in IndexedDB and is never sent to any server.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm mt-2 shadow-lg shadow-emerald-950/40"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Keys & Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/[0.06] text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Log in
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-500">
          By registering, you agree to our{' '}
          <Link to="/terms" className="text-slate-400 underline hover:text-slate-300">Terms of Service</Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-slate-400 underline hover:text-slate-300">Privacy Policy</Link>.
        </div>
      </div>
    </div>
  );
};
