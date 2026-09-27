// ==============================================================================
// SecureTalk Privacy Policy
// Detailed privacy document clearly separating unreadable content from processed metadata
// ==============================================================================

import React from 'react';
import { Shield, FileText, AlertCircle } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0d14] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
        <div className="mb-8 pb-6 border-b border-[#1e2638]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 text-xs font-mono mb-4">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Notice & Privacy Documentation</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-100">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-400 mt-2">
            Last Updated: September 2026 • Version 1.0
          </p>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="mb-8 p-4 bg-[#0e1422] border border-[#1e2638] rounded-lg text-xs text-slate-400 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-200">Legal Review Note:</strong> This policy outlines the actual
            technical functioning and data practices of SecureTalk. Prior to commercial deployment in specific
            jurisdictions, this document should be reviewed by a qualified attorney in [JURISDICTION].
          </p>
        </div>

        <div className="space-y-8 text-xs text-slate-300 leading-relaxed">
          {/* 1. Introduction */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">1. Introduction</h2>
            <p>
              [LEGAL COMPANY NAME] ("we", "our", or "the Service") operates SecureTalk. We are committed
              to strict data minimization and cryptographic privacy. SecureTalk is engineered so that message
              content and file payloads cannot be read by our servers or personnel.
            </p>
          </section>

          {/* 2. Core Distinction: Content vs. Metadata */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-100">
              2. Fundamental Distinction: Content vs. Metadata
            </h2>
            <div className="p-4 bg-[#0a0d14] border border-[#1e2638] rounded-lg space-y-2">
              <span className="font-semibold text-emerald-400 block">Content We CANNOT Read:</span>
              <p className="text-slate-400">
                All message text, images, voice notes, PDFs, and file attachments are encrypted on your local device
                using AES-256-GCM before transmission. Because the server does not hold private keys, we cannot
                decrypt, read, scan, or index your conversations.
              </p>
              <span className="font-semibold text-slate-300 block pt-2">Metadata We Must Process:</span>
              <p className="text-slate-400">
                End-to-end encryption does not eliminate network routing metadata. To deliver messages in real time,
                our infrastructure must process account identifiers (UUIDs), conversation memberships, ciphertext lengths,
                and delivery timestamps.
              </p>
            </div>
          </section>

          {/* 3. Information We Collect */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">3. Information We Collect</h2>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400">
              <li>
                <strong className="text-slate-200">Account Credentials:</strong> Email address (for authentication, verification, and recovery) and password hashes (managed securely by Supabase Auth with salted bcrypt/argon2).
              </li>
              <li>
                <strong className="text-slate-200">Public Profile Data:</strong> Unique username (@username), optional display name, optional avatar URL, and optional bio.
              </li>
              <li>
                <strong className="text-slate-200">Cryptographic Identity Keys:</strong> Public ECDH keys (Curve P-256 SPKI format) to facilitate authenticated key exchange with conversation partners.
              </li>
              <li>
                <strong className="text-slate-200">Technical Device Data:</strong> User-Agent header (operating system / browser family) for active session management and revocation. We do not perform canvas or audio fingerprinting.
              </li>
            </ul>
          </section>

          {/* 4. Local Storage and Keystore */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">4. Local Storage & Cryptographic Keystore</h2>
            <p>
              SecureTalk stores your private cryptographic keys in your browser's local IndexedDB. Your private key
              never leaves your device. If you clear your browser's site data or delete your keystore without backup,
              your private key is permanently erased.
            </p>
          </section>

          {/* 5. Third-Party Infrastructure */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">5. Third-Party Infrastructure</h2>
            <p>We rely on trusted cloud infrastructure providers:</p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400">
              <li>
                <strong className="text-slate-200">Supabase:</strong> Provides managed PostgreSQL database, authentication, encrypted object storage, and real-time WebSockets.
              </li>
              <li>
                <strong className="text-slate-200">Hosting & CDN (Cloudflare Pages):</strong> Provides static asset hosting, DDoS protection, and TLS termination.
              </li>
            </ul>
            <p>
              We do not utilize third-party behavioral analytics, ad tracking scripts, or marketing pixels.
            </p>
          </section>

          {/* 6. Data Retention & Deletion */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">6. Data Retention & Account Deletion</h2>
            <p>
              Users can permanently delete their account at any time via <span className="font-mono text-emerald-400">/settings/security</span>.
              Upon confirmation, your profile, public keys, active sessions, and database memberships are permanently purged.
              Due to automated cloud disaster-recovery retention, immutable encrypted database snapshots may persist for up to 30 days before full expiration.
            </p>
          </section>

          {/* 7. Children's Privacy */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">7. Children's Privacy</h2>
            <p>
              SecureTalk is not directed to individuals under the age of 16 (or higher depending on local jurisdiction).
              We do not knowingly collect personal information from children.
            </p>
          </section>

          {/* 8. Contact Information */}
          <section className="space-y-2 border-t border-[#1e2638] pt-4">
            <h2 className="text-base font-semibold text-slate-100">8. Contact Information</h2>
            <p className="text-slate-400">
              For privacy inquiries, GDPR/CCPA data requests, or questions regarding this policy:
            </p>
            <div className="p-3 bg-[#0c1018] border border-[#1e2638] rounded font-mono text-[11px] text-slate-300 space-y-1">
              <div>Entity: [LEGAL COMPANY NAME]</div>
              <div>Address: [BUSINESS ADDRESS]</div>
              <div>Privacy Contact: [CONTACT EMAIL]</div>
              <div>Jurisdiction: [JURISDICTION]</div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
