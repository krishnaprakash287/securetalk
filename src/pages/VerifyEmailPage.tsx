// ==============================================================================
// SecureTalk Verify Email Page
// Informs user about email confirmation link
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/Logo';

export const VerifyEmailPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#0a0d14] text-slate-100">
      <div className="w-full max-w-md text-center">
        <Logo size="lg" className="justify-center mb-6" />

        <div className="bg-[#0f1422] border border-[#1e2638] rounded-xl p-8 shadow-xl space-y-5">
          <div className="w-14 h-14 bg-emerald-950/80 border border-emerald-800/60 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <Mail className="w-7 h-7" />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            Check your email
          </h1>

          <p className="text-xs text-slate-400 leading-relaxed">
            We sent a verification link to your registered email address. Please click the link to confirm your account and activate end-to-end messaging.
          </p>

          <div className="p-3 bg-[#0a0d14] border border-[#1e2638] rounded-md text-[11px] text-slate-400 flex items-center gap-2 text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Email is only used for authentication and is never shown to other users.</span>
          </div>

          <div className="pt-2">
            <Link to="/login" className="btn-primary w-full py-2.5 text-sm inline-flex items-center justify-center gap-1.5">
              <span>Continue to Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
