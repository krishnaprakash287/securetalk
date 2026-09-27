// ==============================================================================
// SecureTalk Key Management & Agreement
// ECDH (P-256) Key Pair Generation, HKDF Key Derivation, and Safety Numbers
// ==============================================================================

import { bufferToBase64, base64ToBuffer, stringToBytes } from './utils';

// HKDF context identifier for conversation keys
const CONVERSATION_KEY_INFO = stringToBytes('SecureTalk-v1-ConversationKey-AES-256-GCM');

/**
 * Generates an ECDH identity key pair using curve P-256 (secp256r1).
 * Supported natively across all modern browsers.
 */
export async function generateIdentityKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // Extractable so the public key can be published, private key stored in IndexedDB
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Exports a public CryptoKey to a compact Base64 SPKI format or JWK string.
 */
export async function exportPublicKeySpki(publicKey: CryptoKey): Promise<string> {
  const spkiBuffer = await window.crypto.subtle.exportKey('spki', publicKey);
  return bufferToBase64(spkiBuffer);
}

/**
 * Exports a public CryptoKey to a JSON Web Key (JWK).
 */
export async function exportPublicKeyJwk(publicKey: CryptoKey): Promise<JsonWebKey> {
  return await window.crypto.subtle.exportKey('jwk', publicKey);
}

/**
 * Imports a remote user's public key from SPKI Base64 format.
 */
export async function importPublicKeySpki(spkiBase64: string): Promise<CryptoKey> {
  const keyData = base64ToBuffer(spkiBase64);
  return await window.crypto.subtle.importKey(
    'spki',
    keyData as unknown as BufferSource,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

/**
 * Imports a public key from JWK.
 */
export async function importPublicKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

/**
 * Derives a 256-bit AES-GCM conversation key from local private key and remote public key.
 * Uses ECDH to derive shared bits, followed by HKDF-SHA256 expansion.
 * Both parties (A with B's pubkey, and B with A's pubkey) derive the exact identical AES-256 key.
 */
export async function deriveConversationKey(
  localPrivateKey: CryptoKey,
  remotePublicKey: CryptoKey,
  salt?: Uint8Array
): Promise<CryptoKey> {
  // 1. ECDH key agreement to get 256 raw shared bits
  const rawSharedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: remotePublicKey,
    },
    localPrivateKey,
    256
  );

  // 2. Import raw shared secret as HKDF key material
  const hkdfKey = await window.crypto.subtle.importKey(
    'raw',
    rawSharedBits,
    'HKDF',
    false,
    ['deriveKey']
  );

  // 3. Derive 256-bit AES-GCM conversation key using HKDF-SHA256
  const defaultSalt = salt || new Uint8Array(32); // fixed 32-byte zero salt if none provided
  const aesConversationKey = await window.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: defaultSalt as unknown as BufferSource,
      info: CONVERSATION_KEY_INFO as unknown as BufferSource,
    },
    hkdfKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // Extractable for local caching in keystore
    ['encrypt', 'decrypt']
  );

  return aesConversationKey;
}

/**
 * Computes a deterministic human-verifiable Safety Number (cryptographic fingerprint)
 * between two public keys.
 * Users can verify this out-of-band to prevent active Man-In-The-Middle attacks.
 * Format: 6 blocks of 5 decimal digits (30 digits total).
 */
export async function computeSafetyNumber(
  pubKeyA: string,
  pubKeyB: string
): Promise<string> {
  // Sort lexicographically to ensure order-independence
  const sorted = [pubKeyA, pubKeyB].sort();
  const combined = stringToBytes(`${sorted[0]}||${sorted[1]}`);

  // SHA-256 hash of the concatenated public keys
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', combined as unknown as BufferSource);
  const hashBytes = new Uint8Array(hashBuffer);

  // Convert hash bytes to 6 blocks of 5-digit decimal numbers
  const blocks: string[] = [];
  for (let i = 0; i < 6; i++) {
    const chunk = (hashBytes[i * 4] << 24) |
                  (hashBytes[i * 4 + 1] << 16) |
                  (hashBytes[i * 4 + 2] << 8) |
                  hashBytes[i * 4 + 3];
    // Map to 5 digits (00000 - 99999)
    const val = Math.abs(chunk) % 100000;
    blocks.push(val.toString().padStart(5, '0'));
  }

  return blocks.join(' ');
}
