// ==============================================================================
// SecureTalk Security Architecture Page
// Detailed, honest technical specification of the E2EE protocol and threat model
// ==============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Key,
  Server,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  EyeOff,
  Bug,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const SecurityPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0d14] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10 pb-6 border-b border-[#1e2638]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 text-xs font-mono mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Cryptographic Architecture & Threat Model</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100">
            Security Architecture & Cryptography
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-2xl leading-relaxed">
            SecureTalk is engineered so that message contents and attachments are encrypted locally
            on user devices before transmission. The backend functions as an encrypted transport and storage layer.
          </p>
        </div>

        {/* E2EE Visual Architecture Flow */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span>End-to-End Cryptographic Flow</span>
          </h2>

          <div className="card p-6 bg-[#0c1018] font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-3 text-center">
              {/* Sender */}
              <div className="p-3 bg-[#111624] border border-[#1e2638] rounded-lg">
                <span className="text-emerald-400 font-semibold block mb-1">Sender</span>
                <span className="text-slate-300 block">Plaintext</span>
                <span className="text-[10px] text-emerald-400 mt-1 block">Local AES-256-GCM</span>
              </div>

              <div className="text-slate-500 font-bold hidden md:block">→ Ciphertext →</div>

              {/* Server */}
              <div className="p-3 bg-[#16141a] border border-amber-900/50 rounded-lg">
                <span className="text-amber-400 font-semibold block mb-1">Server / Relay</span>
                <span className="text-slate-300 block">Ciphertext Only</span>
                <span className="text-[10px] text-amber-500/90 mt-1 block">No private keys</span>
              </div>

              <div className="text-slate-500 font-bold hidden md:block">→ Ciphertext →</div>

              {/* Recipient */}
              <div className="p-3 bg-[#111624] border border-[#1e2638] rounded-lg">
                <span className="text-emerald-400 font-semibold block mb-1">Recipient</span>
                <span className="text-slate-300 block">Plaintext</span>
                <span className="text-[10px] text-emerald-400 mt-1 block">Authenticated Decrypt</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1e2638] text-[11px] text-slate-400 font-sans leading-relaxed">
              <strong className="text-slate-200">Transport vs. Payload Security:</strong> HTTPS/TLS encrypts
              the communication channel between browser and server, defending against ISP eavesdropping.
              End-to-End Encryption (E2EE) protects message contents and file payloads directly from the server,
              database administrators, and potential cloud service compromises.
            </div>
          </div>
        </section>

        {/* Cryptographic Primitives */}
        <section className="mb-12 space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <span>Cryptographic Primitives & Key Management</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="card space-y-2">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>ECDH Curve P-256 (secp256r1)</span>
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Used for identity key pairs and key agreement. Keys are generated via the browser's native
                <code className="text-emerald-400"> window.crypto.subtle</code> engine. The private key remains
                in browser IndexedDB and is never transmitted over the network.
              </p>
            </div>

            <div className="card space-y-2">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>AES-256-GCM (Authenticated Encryption)</span>
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Messages are encrypted using AES in Galois/Counter Mode with 256-bit keys and 128-bit authentication
                tags. Every message uses a freshly generated 96-bit (12-byte) cryptographic nonce from a secure CSPRNG.
              </p>
            </div>

            <div className="card space-y-2">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>HKDF-SHA256 Expansion</span>
              </h3>
              <p className="text-slate-400 leading-relaxed">
                The raw shared secret derived from ECDH is expanded through HMAC-based Extract-and-Expand Key
                Derivation Function (HKDF) with contextual domain separation strings to prevent domain cross-contamination.
              </p>
            </div>

            <div className="card space-y-2">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Client-Side Attachment Encryption</span>
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Files are encrypted locally with an ephemeral 256-bit AES-GCM key before upload. The storage
                bucket receives only opaque binary ciphertext. The ephemeral key is wrapped using the conversation key.
              </p>
            </div>
          </div>
        </section>

        {/* Metadata Transparency */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-emerald-400" />
            <span>Metadata Transparency</span>
          </h2>

          <div className="card space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              We believe in honest cryptographic documentation. End-to-end encryption conceals message contents
              and file payloads, but it does not conceal all communication metadata:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-[#0c1018] border border-emerald-800/40 rounded-md">
                <span className="font-semibold text-emerald-400 block mb-1">Content the Service CANNOT Read</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Plaintext message text</li>
                  <li>Images, PDFs, and document contents</li>
                  <li>Original attachment filenames</li>
                  <li>Private encryption identity keys</li>
                </ul>
              </div>

              <div className="p-3 bg-[#0c1018] border border-[#232c42] rounded-md">
                <span className="font-semibold text-slate-300 block mb-1">Metadata the Service Must Process</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Sender and recipient account IDs</li>
                  <li>Conversation memberships</li>
                  <li>Approximate message timestamps</li>
                  <li>Ciphertext size (approximate message length)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Threat Model & Browser Limitations */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Threat Model & Browser Limitations</span>
          </h2>

          <div className="card space-y-3 text-xs text-slate-400 leading-relaxed">
            <p>
              Operating cryptography inside modern web browsers provides wide accessibility but has known boundaries:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300">
              <li>
                <strong>Compromised Host Device:</strong> If a user's machine contains keyloggers, malware, or
                untrusted browser extensions, memory can be inspected before encryption or after decryption occurs.
              </li>
              <li>
                <strong>Physical Device Access:</strong> If an unlocked device is seized, local browser IndexedDB
                can be accessed unless browser disk encryption / screen lock is active.
              </li>
              <li>
                <strong>Man-In-The-Middle (MITM) Mitigations:</strong> Users should verify Safety Numbers
                (SHA-256 public key fingerprints) out-of-band to ensure the public key served by the backend has not been substituted.
              </li>
            </ul>
          </div>
        </section>

        {/* Important Disclaimer (Requirement #45) */}
        <section className="mb-12">
          <div className="card border-amber-900/60 bg-amber-950/10 p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Cryptographic Audit Notice & Disclaimer</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Implementing cryptographic software securely is difficult. SecureTalk utilizes audited standard
              primitives (Web Crypto API AES-256-GCM and ECDH P-256). However, this application has not yet undergone
              a formal third-party independent security audit. Do not rely upon this service for life-critical or
              adversarial state-level sensitive communications without independent verification.
            </p>
          </div>
        </section>

        {/* Vulnerability Reporting Link */}
        <section className="card flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Discovered a Security Vulnerability?</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Read our coordinated disclosure policy and report issues responsibly.
            </p>
          </div>
          <Link to="/security/report" className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 flex-shrink-0">
            <Bug className="w-3.5 h-3.5 text-emerald-400" />
            <span>Disclosure Policy</span>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
};
