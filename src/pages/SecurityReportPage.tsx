// ==============================================================================
// SecureTalk Security Vulnerability Disclosure Page
// Guidelines for security researchers reporting vulnerabilities
// ==============================================================================

import React from 'react';
import { Bug, ShieldCheck, Mail, Key, AlertCircle } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const SecurityReportPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0d14] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
        <div className="mb-8 pb-6 border-b border-[#1e2638]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 text-xs font-mono mb-4">
            <Bug className="w-3.5 h-3.5" />
            <span>Coordinated Vulnerability Disclosure</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Security Vulnerability Reporting
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            We welcome constructive reports from security researchers and developers to help keep SecureTalk safe.
          </p>
        </div>

        <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
          {/* Reporting Channel */}
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>How to Submit a Report</span>
            </h2>
            <p className="text-slate-400">
              Please email potential security vulnerabilities directly to:
            </p>
            <div className="p-3 bg-[#0c1018] border border-[#1e2638] rounded font-mono text-emerald-400 select-all">
              security@securetalk.app
            </div>
            <p className="text-slate-400">
              Please include detailed steps to reproduce the issue, proof-of-concept payloads where applicable,
              and your contact details. If sending sensitive details, please use our public PGP key.
            </p>
          </div>

          {/* Scope */}
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Program Scope</span>
            </h2>
            <p className="text-slate-400">In-Scope Areas:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
              <li>Flaws in client-side encryption, decryption, or nonce handling.</li>
              <li>Row Level Security (RLS) bypasses leading to unauthorized ciphertext or attachment access.</li>
              <li>Unauthorized message injection or tampering into conversations.</li>
              <li>Authentication bypasses or cryptographic identity spoofing.</li>
              <li>Cross-Site Scripting (XSS) that could expose decrypted memory.</li>
            </ul>

            <p className="text-slate-400 pt-2">Out-of-Scope:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li>Denial of service (DoS/DDoS) attacks against backend infrastructure.</li>
              <li>Spam or automated account registration without a demonstrable vulnerability.</li>
              <li>Physical attacks against unlocked devices.</li>
            </ul>
          </div>

          {/* Safe Harbor */}
          <div className="card space-y-2 border-emerald-900/40 bg-emerald-950/10">
            <h2 className="text-sm font-semibold text-emerald-300">Safe Harbor Commitment</h2>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              If you conduct security research in good faith and adhere to standard coordinated disclosure
              principles (giving us reasonable time to remediate before public disclosure), we will not pursue
              legal action against you.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
