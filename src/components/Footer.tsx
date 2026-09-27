// ==============================================================================
// SecureTalk Footer Component
// Serious privacy-first design with genuine documentation links and zero fake metrics
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { ShieldCheck, Lock, FileText, Bug } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/[0.07] bg-[#070a10] text-slate-400 py-12 px-4 sm:px-6 select-none">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-3.5">
            <Logo size="md" />
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              SecureTalk is a privacy-first real-time messaging application. Messages and attachments
              are encrypted locally on your device using Web Crypto (AES-256-GCM and ECDH P-256)
              before reaching the network. The server never receives plaintext message content.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Client-side AES-256-GCM</span>
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-Knowledge Server</span>
              </span>
            </div>
          </div>

          {/* Security & Cryptography */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Security & Trust
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/security" className="hover:text-emerald-400 transition-colors">
                  Security Architecture
                </Link>
              </li>
              <li>
                <Link to="/security/report" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <Bug className="w-3.5 h-3.5 text-slate-400" />
                  <span>Vulnerability Disclosure</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Legal & Privacy
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/privacy" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-emerald-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <span className="text-slate-500 text-[11px] block pt-1">
                  Zero tracking cookies or marketing pixels.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} SecureTalk. Built for private, username-based communications.</p>
          <p className="font-mono text-[11px] text-slate-400">
            Protocol: ECDH-P256 + HKDF-SHA256 + AES-256-GCM
          </p>
        </div>
      </div>
    </footer>
  );
};
