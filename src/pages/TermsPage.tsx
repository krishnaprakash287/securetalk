// ==============================================================================
// SecureTalk Terms and Conditions Page
// Terms of service covering acceptable use, username rules, and legal limitations
// ==============================================================================

import React from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0d14] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
        <div className="mb-8 pb-6 border-b border-[#1e2638]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 text-xs font-mono mb-4">
            <FileText className="w-3.5 h-3.5" />
            <span>Service Agreement & Terms of Use</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-100">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-400 mt-2">
            Last Updated: September 2026 • Version 1.0
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mb-8 p-4 bg-[#0e1422] border border-[#1e2638] rounded-lg text-xs text-slate-400 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-200">Legal Notice:</strong> These terms govern use of the SecureTalk
            application provided by [LEGAL COMPANY NAME]. This document should be reviewed and customized
            by legal counsel before commercial launch in [JURISDICTION].
          </p>
        </div>

        <div className="space-y-8 text-xs text-slate-300 leading-relaxed">
          {/* 1. Eligibility */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">1. Eligibility</h2>
            <p>
              By accessing or creating an account on SecureTalk, you represent and warrant that you are at
              least 16 years of age (or the minimum age of digital consent in your jurisdiction) and have the
              legal capacity to enter into these Terms.
            </p>
          </section>

          {/* 2. Account Responsibilities & Username Rules */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">2. Account Responsibilities & Username Rules</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and device keystore.
              When selecting a unique username (@username), you agree:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Not to register usernames for the purpose of squatting, selling, or auctioning.</li>
              <li>Not to impersonate staff, moderators, organizations, or other individuals.</li>
              <li>Not to select usernames that contain slurs, hate speech, or trademark violations.</li>
            </ul>
            <p>
              We reserve the right to reclaim or reassign usernames that violate these rules.
            </p>
          </section>

          {/* 3. Acceptable Use & Prohibited Activities */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">3. Acceptable Use & Prohibited Activities</h2>
            <p>
              SecureTalk is designed for private, lawful communications. You agree that you will not use the service to:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400">
              <li>Transmit or distribute illegal material, child sexual abuse material (CSAM), or violent terrorism content.</li>
              <li>Engage in harassment, stalking, extortion, or non-consensual sharing of intimate media.</li>
              <li>Deploy automated bots, scrapers, or spammers to send unsolicited chat requests.</li>
              <li>Attempt to reverse-engineer, exploit, or bypass Row Level Security policies or server infrastructure.</li>
              <li>Interfere with or disrupt network routing, WebSocket channels, or storage buckets.</li>
            </ul>
          </section>

          {/* 4. Cryptographic Encryption & Content Neutrality */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">4. Cryptographic Encryption & Content Neutrality</h2>
            <p>
              Because message contents and attachments are end-to-end encrypted on sender devices, [LEGAL COMPANY NAME]
              does not and cannot monitor the contents of private messages. Users are solely responsible for all
              content they transmit.
            </p>
          </section>

          {/* 5. Account Suspension & Termination */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">5. Account Suspension & Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms, engage in abuse,
              or generate demonstrable infrastructure attacks. Users may also terminate their account at any time
              using the account deletion feature.
            </p>
          </section>

          {/* 6. Service Availability & Disclaimers */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">6. Service Availability & Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED. WE DO NOT GUARANTEE UNINTERRUPTED REAL-TIME DELIVERY, 100% UPTIME, OR THAT
              THE SERVICE WILL BE COMPLETELY FREE FROM VULNERABILITIES.
            </p>
          </section>

          {/* 7. Limitation of Liability */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-100">7. Limitation of Liability</h2>
            <p>
              TO THE FULLEST EXTENT PERMITTED BY LAW, [LEGAL COMPANY NAME] SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, DEVICE COMPROMISE,
              OR INTERRUPTION OF BUSINESS ARISING FROM YOUR USE OF SECURETALK.
            </p>
          </section>

          {/* 8. Governing Law & Contact */}
          <section className="space-y-2 border-t border-[#1e2638] pt-4">
            <h2 className="text-base font-semibold text-slate-100">8. Governing Law & Contact</h2>
            <p className="text-slate-400">
              These Terms shall be governed by and construed in accordance with the laws of [JURISDICTION],
              without regard to conflict of law principles.
            </p>
            <div className="p-3 bg-[#0c1018] border border-[#1e2638] rounded font-mono text-[11px] text-slate-300 space-y-1">
              <div>Entity: [LEGAL COMPANY NAME]</div>
              <div>Address: [BUSINESS ADDRESS]</div>
              <div>Contact: [CONTACT EMAIL]</div>
              <div>Jurisdiction: [JURISDICTION]</div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
