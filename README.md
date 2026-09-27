# SecureTalk — Privacy-First End-to-End Encrypted Messenger

SecureTalk is a production-quality, privacy-first real-time messaging application featuring genuine client-side end-to-end encryption (E2EE), username-based identity discovery, and a zero-knowledge backend architecture.

---

## 1. Project Overview

Modern messengers often tie user identities to cellular phone numbers, leaking social graphs and telephony metadata to carriers and state actors. SecureTalk eliminates phone numbers from the registration model and enforces genuine client-side authenticated cryptography before data reaches the network:

* **Username-First Identity**: Users register and connect strictly via unique lowercase handles (e.g., `@krishna_dev`, `@alice24`). Email addresses are stored solely for credential recovery and are never exposed via search endpoints or contact lists.
* **Genuine Client-Side E2EE**: Message contents, replies, and file attachments are encrypted on the sender's device using standard Web Crypto API primitives (AES-256-GCM, ECDH Curve P-256, and HKDF-SHA256).
* **Zero Plaintext Storage**: The Supabase PostgreSQL database receives and stores only Base64-encoded ciphertext, nonces, and cryptographic tags. The backend never holds private keys.
* **Client-Side Attachment Encryption**: Files and images are encrypted locally using ephemeral 256-bit AES-GCM keys before being uploaded to private object storage buckets.
* **Request-Gated Messaging**: Direct messages cannot be sent until a bilateral chat request is accepted, strictly enforced at the database level using Row Level Security (RLS).
* **Local In-Memory Message Search**: Search operates locally over already-decrypted in-memory messages. The server never executes or sees search queries.
* **Out-of-Band Verification**: Cryptographic Safety Numbers (SHA-256 public key fingerprints) enable users to verify channels in person or via trusted secondary media to detect active Man-In-The-Middle (MITM) attacks.

---

## 2. Cryptographic Architecture

### 2.1 Protocol Pipeline

```
[ Sender Device ]
  1. Plaintext Input
  2. Generate 96-bit CSPRNG Nonce (crypto.getRandomValues)
  3. AES-256-GCM Encrypt + 128-bit Authentication Tag
  4. Transmit Ciphertext, Nonce, and Version to Supabase
              │
              ▼ (TLS / HTTPS Transport)
[ Supabase Relay & Database ]
  • Row Level Security (RLS) validates conversation membership
  • Stores: ciphertext, nonce, sender_id, created_at
  • Transmits Ciphertext via Realtime WebSocket
              │
              ▼ (TLS / WebSocket Transport)
[ Recipient Device ]
  1. Receive Ciphertext + 96-bit Nonce
  2. Load cached AES-256-GCM conversation key from IndexedDB
  3. Authenticated AES-GCM Decrypt
  4. Verify 128-bit Tag (abort if 1 byte modified)
  5. Render Decrypted Plaintext
```

### 2.2 Key Exchange & Key Management

* **Identity Keys**: Each user generates an Elliptic Curve Diffie-Hellman (ECDH) keypair using curve **P-256** (`secp256r1`).
* **Private Key Isolation**: Private keys are stored in client-side **IndexedDB** (`securetalk_keystore_v1`). They are never stored in localStorage, never transmitted over the network, and never exposed in logs or query parameters.
* **Public Key Distribution**: Public keys are exported in SPKI Base64 format and published to the `public_keys` table.
* **Shared Secret Derivation**: When Alice initiates communication with Bob:
  1. Alice fetches Bob's public key from `public_keys`.
  2. Alice computes ECDH raw shared bits: `deriveBits({ name: 'ECDH', public: BobPubKey }, AlicePrivKey, 256)`.
  3. Alice expands the shared secret via **HKDF-SHA256** with salt and info (`SecureTalk-v1-ConversationKey-AES-256-GCM`) to produce an AES-256-GCM `CryptoKey`.
  4. Bob performs the symmetric derivation with his private key and Alice's public key. Both parties arrive at the identical 256-bit symmetric key without exchanging secret material.
  5. The derived conversation key is cached in IndexedDB for sub-millisecond encryption and decryption of incoming/outgoing streams.

### 2.3 Attachment Encryption

* Attachments are checked client-side against strict file size limits (50 MB) and extension allowlists.
* An ephemeral 256-bit AES-GCM key and 12-byte IV are generated specifically for the file.
* The file's binary content is encrypted with the ephemeral key.
* The ephemeral key and original filename are wrapped (encrypted) with the conversation key.
* The encrypted binary blob is uploaded to Supabase Storage with MIME type `application/octet-stream`.
* Only members possessing the conversation key can unwrap the file key and decrypt the payload locally.

---

## 3. Technology Stack

* **Frontend**: React 19, TypeScript (Strict Mode), Vite, Tailwind CSS
* **Icons**: Lucide React (Clean SVG icons, no emoji interface glyphs)
* **Backend**: Supabase (PostgreSQL 15+, Supabase Auth, Supabase Realtime, Supabase Storage)
* **Cryptography**: Web Crypto API (`window.crypto.subtle`), IndexedDB (`idb`)
* **Testing**: Vitest, JSDOM, Fake-IndexedDB
* **Design Standards**: Clean slate/zinc neutral palette, accessible contrast, restrained motion, responsive design from 320px to 1440px+.

---

## 4. Folder Structure

```
securetalk/
├── public/
│   ├── favicon.svg             # Bespoke SVG shield/lock logo
│   ├── favicon.png             # 32x32 standard favicon
│   ├── apple-touch-icon.png    # 180x180 iOS touch icon
│   └── og-image.png            # 1200x630 Open Graph preview image
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── Logo.tsx            # Brand SVG logo
│   │   ├── Navbar.tsx          # Responsive navigation & mobile drawer
│   │   ├── Footer.tsx          # Accessible footer with legal links
│   │   ├── UserAvatar.tsx      # Avatar with presence indicator
│   │   ├── ProtectedRoute.tsx  # Auth state guard & redirector
│   │   ├── UserSearchModal.tsx # @username discovery modal
│   │   ├── SafetyNumberModal.tsx # Fingerprint verification modal
│   │   └── chat/               # Real-time chat UI components
│   │       ├── ChatHeader.tsx
│   │       ├── ConversationList.tsx
│   │       ├── MessageComposer.tsx
│   │       ├── MessageItem.tsx
│   │       └── LocalMessageSearch.tsx
│   ├── context/
│   │   ├── AuthContext.tsx     # Session, profile & settings state
│   │   └── ChatContext.tsx     # Realtime conversations & request badges
│   ├── crypto/                 # Pure cryptographic modules
│   │   ├── attachment.ts       # Client-side attachment encryption
│   │   ├── cipher.ts           # AES-256-GCM encryption & decryption
│   │   ├── keys.ts             # ECDH P-256 key exchange & HKDF
│   │   ├── keystore.ts         # IndexedDB CryptoKey persistence
│   │   ├── types.ts            # Crypto interfaces
│   │   └── utils.ts            # CSPRNG, Base64 & byte conversion
│   ├── lib/
│   │   └── supabase.ts         # Supabase client initialization
│   ├── pages/                  # Application views
│   │   ├── LandingPage.tsx     # Concrete technical landing page
│   │   ├── LoginPage.tsx       # Auth login
│   │   ├── RegisterPage.tsx    # Zero-knowledge registration
│   │   ├── VerifyEmailPage.tsx # Email confirmation view
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   ├── ChatsPage.tsx       # Real-time messaging split view
│   │   ├── RequestsPage.tsx    # Chat requests management
│   │   ├── ProfilePage.tsx     # Profile viewing & editing
│   │   ├── SettingsLayout.tsx  # Settings navigation
│   │   ├── PrivacySettingsPage.tsx # Receipts, typing, presence switches
│   │   ├── SecuritySettingsPage.tsx # Keys, keystore wipe, delete account
│   │   ├── DevicesPage.tsx     # Device session revocation
│   │   ├── SecurityPage.tsx    # Architecture & threat model doc
│   │   ├── SecurityReportPage.tsx # Vulnerability disclosure policy
│   │   ├── PrivacyPage.tsx     # GDPR/CCPA privacy policy
│   │   └── TermsPage.tsx       # Terms of service
│   ├── services/               # API & Database services
│   │   ├── authService.ts
│   │   ├── chatService.ts
│   │   ├── realtimeService.ts
│   │   └── userService.ts
│   ├── test/                   # Vitest automated test suites
│   │   ├── crypto.test.ts      # Key exchange & round-trip tests
│   │   ├── security_policies.test.ts # Tamper verification (1-byte test)
│   │   ├── validation.test.ts  # Username & error sanitization tests
│   │   └── setup.ts            # Test environment polyfills
│   ├── types/
│   │   └── database.ts         # TypeScript schema definitions
│   └── utils/
│       ├── errors.ts           # Secret-stripping safe error handler
│       └── validation.ts       # Input & username regex validation
├── supabase/
│   ├── migrations/
│   │   ├── 20260927000000_securetalk_core_schema.sql # Core tables & RLS
│   │   └── 20260927000001_storage_setup.sql          # Encrypted storage & RLS
│   └── schema.sql              # Combined database migration script
├── .env.example                # Environment variable documentation
├── tailwind.config.js          # Security palette & typography config
└── vite.config.ts              # Vite & Vitest configuration
```

---

## 5. Environment Variables Setup

Create a `.env` file in the root directory (based on `.env.example`):

```bash
# PUBLIC CLIENT CONFIGURATION (Safe to bundle in Vite frontend)
VITE_SUPABASE_URL=https://kpyuxeeefwyxlmsxepjv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_CuJrfXYwIbsQg3MBLaO70Q_MLM69mYg
VITE_APP_NAME=SecureTalk
VITE_APP_URL=http://localhost:5173

# SERVER-ONLY SECRETS (NEVER expose in client-side code or git!)
# SUPABASE_SERVICE_ROLE_KEY=
# DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.kpyuxeeefwyxlmsxepjv.supabase.co:5432/postgres
```

---

## 6. Supabase Database & Security Setup

1. Open your Supabase Project Dashboard: [https://supabase.com/dashboard/project/kpyuxeeefwyxlmsxepjv](https://supabase.com/dashboard/project/kpyuxeeefwyxlmsxepjv).
2. Navigate to **SQL Editor**.
3. Copy the contents of [`supabase/migrations/20260927000000_securetalk_core_schema.sql`](supabase/migrations/20260927000000_securetalk_core_schema.sql) and execute the script.
4. Copy the contents of [`supabase/migrations/20260927000001_storage_setup.sql`](supabase/migrations/20260927000001_storage_setup.sql) and execute it to create the `encrypted-attachments` storage bucket and RLS policies.
5. In **Database -> Publications**, verify that `supabase_realtime` includes `messages`, `chat_requests`, and `conversation_members`.

---

## 7. Row Level Security (RLS) Policy Summary

All tables enforce Row Level Security:

| Table | Policy | Operation | Rule |
| :--- | :--- | :--- | :--- |
| `profiles` | Discoverable or contacts | `SELECT` | `auth.uid() = id OR is_discoverable OR is_conversation_partner` |
| `profiles` | Self-management | `INSERT / UPDATE` | `auth.uid() = id` |
| `public_keys` | Public read | `SELECT` | Authenticated users can read public keys |
| `public_keys` | Self-publish | `INSERT / UPDATE` | `auth.uid() = user_id` |
| `conversations` | Member access | `SELECT` | Only members in `conversation_members` |
| `chat_requests` | Participant read | `SELECT` | `sender_id = auth.uid() OR recipient_id = auth.uid()` |
| `chat_requests` | Non-blocked send | `INSERT` | `sender_id = auth.uid() AND NOT blocked` |
| `messages` | Member read | `SELECT` | Only members in `conversation_members` |
| `messages` | Non-blocked insert | `INSERT` | `sender_id = auth.uid() AND member AND NOT blocked` |
| `attachments` | Member read | `SELECT` | Only members of conversation containing message |
| `blocked_users` | Self-management | `ALL` | `blocker_id = auth.uid()` |
| `devices` | Self-management | `ALL` | `user_id = auth.uid()` |

---

## 8. Installation & Development

```bash
# 1. Clone repository
git clone https://github.com/example/securetalk.git
cd securetalk

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Open in browser
http://localhost:5173
```

---

## 9. Automated Security Testing

SecureTalk includes comprehensive automated tests covering cryptographic correctness and tamper resistance:

```bash
# Run test suite
npm run test
```

### Verified Test Cases:
1. **P-256 ECDH Key Agreement**: Generates valid keypairs, exports/imports SPKI, and derives identical 256-bit AES-GCM conversation keys for both parties.
2. **Authenticated Encryption Round-Trip**: Encrypts plaintext and decrypts successfully.
3. **1-Byte Ciphertext Tamper Verification**: Mutating even a single byte of ciphertext throws an integrity verification error.
4. **1-Byte Tag Tamper Verification**: Altering any bit of the 128-bit authentication tag causes AES-GCM decryption to fail.
5. **Nonce Tamper Verification**: Corrupted initialization vectors abort decryption.
6. **Wrong Key Rejection**: Third parties (Eve) cannot decrypt messages intended for Bob.
7. **Client-Side Attachment Encryption**: Ephemeral key wrapping and binary file decryption fidelity.
8. **Keystore Isolation**: Local IndexedDB keys are purged cleanly upon logout or account deletion.
9. **Username Sanitization**: Validates 3–30 characters, lowercase normalization, and blocks reserved/impersonation usernames.
10. **Error Leakage Prevention**: Sanitizes errors to ensure database URIs, passwords, JWT tokens, and private keys never leak into the UI.

---

## 10. Production Deployment

### Cloudflare Pages:
1. Connect your repository to Cloudflare Pages.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add environment variables:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
5. Enable SPA fallback route (`index.html`).

---

## 11. Threat Model & Limitations

* **Threats Defended Against**:
  * Compromised Database: Server compromise yields only Base64 ciphertext blobs and encrypted attachments. Plaintext cannot be extracted without client private keys.
  * Passive Network Eavesdropping: HTTPS/TLS combined with AES-256-GCM protects transport and payload layers.
  * Unsolicited Messaging: RLS strictly blocks message inserts unless an accepted chat request exists.
* **Known Browser Limitations**:
  * Compromised Client Endpoint: If a user's operating system is infected with malware, keyloggers, or malicious browser extensions, memory can be inspected after decryption.
  * Metadata Exposure: Real-time routing requires processing message timestamps, sender/recipient IDs, and payload byte lengths.

---

## 12. Security Audit Checklist

- [x] Zero plaintext message storage in PostgreSQL.
- [x] Zero plaintext attachment storage in Supabase Storage.
- [x] Zero private key transmission over network or APIs.
- [x] Private keys stored in browser IndexedDB (non-extractable CryptoKey).
- [x] CSPRNG nonces generated per message using `crypto.getRandomValues`.
- [x] Zero use of `Math.random()` for security purposes.
- [x] Row Level Security (RLS) enabled on all database tables.
- [x] Bilateral chat request gate enforced server-side.
- [x] Client-side attachment encryption with ephemeral keys.
- [x] Out-of-band SHA-256 Safety Number verification modal.
- [x] Granular privacy switches (read receipts, typing, presence).
- [x] Safe error handling preventing token or secret leakage.
- [x] Permanent account deletion with keystore wipe.
- [x] Complete legal documentation (Privacy Policy, Terms of Service, Security Architecture, Vulnerability Reporting).
