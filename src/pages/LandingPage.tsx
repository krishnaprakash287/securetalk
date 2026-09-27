// ==============================================================================
// SecureTalk Landing Page
// Concrete, technical explanation of the architecture with zero marketing hype
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  AtSign,
  Zap,
  Sliders,
  FileCheck,
  ArrowRight,
  Terminal,
  CheckCircle2,
  KeyRound,
  EyeOff,
  Database,
  Smartphone,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#080b11] text-slate-100 select-none overflow-x-hidden">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative py-24 md:py-32 px-4 sm:px-6 max-w-6xl mx-auto text-center border-b border-white/[0.07]">
          {/* Ambient Glows */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/4 left-1/4 w-[300px] h-[250px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 text-xs font-mono mb-8 shadow-sm">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero-Knowledge Real-Time Messaging Architecture</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
              Private conversations,{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                encrypted before
              </span>{' '}
              they leave your device.
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
              Communicate in real time with genuine client-side AES-256-GCM and ECDH cryptography.
              The database stores only ciphertext. No phone numbers, no trackers, and no plaintext keys.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              {user ? (
                <Link to="/chats" className="btn-primary text-sm px-6 py-3 w-full sm:w-auto shadow-lg shadow-emerald-950/50">
                  <span>Go to Conversations</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary text-sm px-6 py-3 w-full sm:w-auto shadow-lg shadow-emerald-950/50">
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                  <Link to="/security" className="btn-secondary text-sm px-6 py-3 w-full sm:w-auto">
                    <span>Inspect Security Specs</span>
                  </Link>
                </>
              )}
            </div>

            {/* Interactive Pipeline Diagram */}
            <div className="mt-16 glass-card text-left max-w-3xl mx-auto font-mono text-xs shadow-2xl">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/[0.08] text-slate-400">
                <span className="flex items-center gap-2 font-semibold text-slate-200">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Cryptographic Pipeline Execution
                </span>
                <span className="badge-e2ee text-[10px]">
                  ECDH P-256 + AES-256-GCM
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-slate-300">
                <div className="p-3.5 bg-[#090d16] border border-white/[0.08] rounded-xl space-y-1 shadow-inner">
                  <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>1. Sender Device</span>
                  </div>
                  <div className="text-[11px] text-slate-400">Local plaintext input</div>
                  <div className="text-[11px] text-emerald-400 font-medium">AES-256-GCM Encrypt</div>
                  <div className="text-[10px] text-slate-500 font-mono pt-1">96-bit CSPRNG Nonce</div>
                </div>

                <div className="p-3.5 bg-[#090d16] border border-amber-900/40 rounded-xl space-y-1 shadow-inner">
                  <div className="text-amber-400 font-bold mb-1 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    <span>2. Network & Cloud</span>
                  </div>
                  <div className="text-[11px] text-slate-400">Ciphertext payload only</div>
                  <div className="text-[11px] text-amber-300/90 font-medium">PostgreSQL RLS verified</div>
                  <div className="text-[10px] text-slate-500 font-mono pt-1">Zero plaintext stored</div>
                </div>

                <div className="p-3.5 bg-[#090d16] border border-white/[0.08] rounded-xl space-y-1 shadow-inner">
                  <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>3. Recipient Device</span>
                  </div>
                  <div className="text-[11px] text-slate-400">Receive ciphertext + tag</div>
                  <div className="text-[11px] text-emerald-400 font-medium">Local Client Decrypt</div>
                  <div className="text-[10px] text-slate-500 font-mono pt-1">128-bit tag verified</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 1. PRIVATE BY DESIGN */}
        <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto border-b border-white/[0.07]">
          <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-2 font-semibold">Architecture 01</div>
          <h2 className="text-3xl font-extrabold text-white mb-4 tracking-tight">
            Private by Design: No Phone Numbers Required
          </h2>
          <p className="text-slate-400 leading-relaxed max-w-3xl mb-10 text-sm sm:text-base">
            SecureTalk abandons phone-number-based identity. Telephony identifiers link communications to SIM cards, carrier billing, and personal data brokers. On SecureTalk, you register with a unique handle (@username). Email is stored strictly for account recovery and is never revealed to peers.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card space-y-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-3">
                <AtSign className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Username Discovery
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect using public handles like <span className="font-mono text-emerald-400 font-medium">@alice24</span>.
                Search queries strictly match usernames. Your device contacts are never scraped or synchronized.
              </p>
            </div>

            <div className="card space-y-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 mb-3">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Request-Gated Messaging
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No spam or unsolicited direct messages. A bilateral chat request must be approved before any
                cryptographic conversation key can be established.
              </p>
            </div>
          </div>
        </section>

        {/* 2. END-TO-END ENCRYPTION */}
        <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto border-b border-white/[0.07]">
          <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-2 font-semibold">Architecture 02</div>
          <h2 className="text-3xl font-extrabold text-white mb-4 tracking-tight">
            Genuine Client-Side Cryptography
          </h2>
          <p className="text-slate-400 leading-relaxed max-w-3xl mb-10 text-sm sm:text-base">
            Messages are never decrypted on the server. Each browser client generates an ECDH key pair in IndexedDB. Bilateral key exchange produces a shared secret expanded via HKDF into an AES-256-GCM symmetric cipher key.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card space-y-2">
              <div className="text-emerald-400 font-mono text-xs font-bold">AES-256-GCM</div>
              <div className="text-base font-bold text-white">Authenticated Cipher</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                128-bit authentication tags verify message integrity. Modifying a single bit causes decryption to fail.
              </p>
            </div>

            <div className="card space-y-2">
              <div className="text-emerald-400 font-mono text-xs font-bold">ECDH NIST P-256</div>
              <div className="text-base font-bold text-white">Key Agreement</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Both parties compute shared keys without transmitting secrets. Private keys never leave IndexedDB.
              </p>
            </div>

            <div className="card space-y-2">
              <div className="text-emerald-400 font-mono text-xs font-bold">HKDF-SHA256</div>
              <div className="text-base font-bold text-white">Key Derivation</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Derives independent keys using contextual separation strings to prevent key reuse and domain confusion.
              </p>
            </div>
          </div>
        </section>

        {/* 3. ATTACHMENT ENCRYPTION */}
        <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto border-b border-white/[0.07]">
          <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-2 font-semibold">Architecture 03</div>
          <h2 className="text-3xl font-extrabold text-white mb-4 tracking-tight">
            Local Attachment Encryption
          </h2>
          <p className="text-slate-400 leading-relaxed max-w-3xl mb-10 text-sm sm:text-base">
            Images, documents, and files are encrypted client-side with an ephemeral 256-bit AES-GCM key before upload. The cloud bucket holds only raw binary ciphertext blobs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="card flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="font-bold text-white block text-sm">Encrypted File Payloads</span>
                <p className="text-slate-400 leading-relaxed">
                  Storage bucket stores <span className="font-mono text-emerald-400">application/octet-stream</span> cipher blobs.
                  Original filenames and MIME types are encrypted locally.
                </p>
              </div>
            </div>

            <div className="card flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="font-bold text-white block text-sm">Key Wrapping Protocol</span>
                <p className="text-slate-400 leading-relaxed">
                  The sender wraps the file key using the conversation key. Only authorized conversation
                  members possess the cryptographic capability to decrypt.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. PRIVACY CONTROLS */}
        <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto border-b border-white/[0.07]">
          <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-2 font-semibold">Architecture 04</div>
          <h2 className="text-3xl font-extrabold text-white mb-4 tracking-tight">
            Granular Privacy Switches
          </h2>
          <p className="text-slate-400 leading-relaxed max-w-3xl mb-10 text-sm sm:text-base">
            Metadata can reveal communication patterns. SecureTalk gives you direct, switch-level control over read receipts, typing activity broadcasts, and search discoverability.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card space-y-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <div className="text-base font-bold text-white">Read Receipts</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Toggle delivery and read status indicators without losing access to your conversations.
              </p>
            </div>

            <div className="card space-y-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <div className="text-base font-bold text-white">Typing Broadcasts</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Prevent transmission of ephemeral typing activity over the WebSocket channel.
              </p>
            </div>

            <div className="card space-y-2">
              <EyeOff className="w-5 h-5 text-emerald-400" />
              <div className="text-base font-bold text-white">Search Discoverability</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hide your @username from global discovery queries, allowing contact only via direct handles.
              </p>
            </div>
          </div>
        </section>

        {/* 5. FAQ */}
        <section className="py-20 px-4 sm:px-6 max-w-4xl mx-auto border-b border-white/[0.07]">
          <h2 className="text-3xl font-extrabold text-white mb-8 text-center tracking-tight">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            <div className="card space-y-2">
              <h3 className="text-sm font-bold text-white">
                Can the server operators or cloud host read my chat messages?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No. Plaintext contents are encrypted on your local device before transmission. The
                PostgreSQL database receives only base64 ciphertext and a 12-byte initialization vector. The server does not possess your private identity key.
              </p>
            </div>

            <div className="card space-y-2">
              <h3 className="text-sm font-bold text-white">
                Why does SecureTalk require an email address?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Email is used solely for account authentication, password recovery, and security notifications.
                Your email address is never exposed in user search and is never visible to peers.
              </p>
            </div>

            <div className="card space-y-2">
              <h3 className="text-sm font-bold text-white">
                How does message search work if content is encrypted?
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Because the database stores only ciphertext, server-side message search is impossible. Message search is
                performed locally in your browser by decrypting messages within your active session and matching queries in memory.
              </p>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="py-24 px-4 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 max-w-xl mx-auto space-y-4">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Start communicating securely
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Register your unique @username and establish end-to-end encrypted conversations in seconds.
            </p>
            <div className="pt-2">
              <Link to="/register" className="btn-primary text-sm px-7 py-3 shadow-xl shadow-emerald-950/60">
                Create Your Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
