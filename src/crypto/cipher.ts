// ==============================================================================
// SecureTalk Symmetric Cipher Implementation
// Authenticated Encryption & Decryption via AES-256-GCM
// ==============================================================================

import { bufferToBase64, base64ToBuffer, stringToBytes, bytesToString, getSecureRandomBytes } from './utils';
import type { EncryptedMessagePayload } from './types';

export const CURRENT_ENCRYPTION_VERSION = 1;

export interface MessagePayloadEnvelope {
  text: string;
  timestamp: string;
  replyToId?: string | null;
}

/**
 * Encrypts a plaintext message using AES-256-GCM with a fresh 12-byte random IV.
 * Produces ciphertext combined with a 128-bit authentication tag.
 */
export async function encryptMessage(
  payload: string | MessagePayloadEnvelope,
  conversationKey: CryptoKey
): Promise<EncryptedMessagePayload> {
  // Convert payload to canonical JSON string
  const plaintext = typeof payload === 'string'
    ? JSON.stringify({ text: payload, timestamp: new Date().toISOString() })
    : JSON.stringify(payload);

  const encodedPlaintext = stringToBytes(plaintext);

  // Generate 96-bit (12-byte) cryptographically secure random IV for AES-GCM
  const iv = getSecureRandomBytes(12);

  // Perform AES-256-GCM encryption with 128-bit tag
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      tagLength: 128,
    },
    conversationKey,
    encodedPlaintext as unknown as BufferSource
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    nonce: bufferToBase64(iv),
    encryption_version: CURRENT_ENCRYPTION_VERSION,
  };
}

/**
 * Decrypts an AES-256-GCM message payload using the conversation key and nonce.
 * Validates the 128-bit authentication tag.
 * Throws an Error if ciphertext has been tampered with or if key is invalid.
 */
export async function decryptMessage(
  encrypted: { ciphertext: string; nonce: string; encryption_version?: number },
  conversationKey: CryptoKey
): Promise<MessagePayloadEnvelope> {
  try {
    const iv = base64ToBuffer(encrypted.nonce);
    const ciphertext = base64ToBuffer(encrypted.ciphertext);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
        tagLength: 128,
      },
      conversationKey,
      ciphertext as unknown as BufferSource
    );

    const jsonString = bytesToString(decryptedBuffer);
    
    // Parse message payload envelope
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed === 'object' && parsed !== null && typeof parsed.text === 'string') {
        return parsed as MessagePayloadEnvelope;
      }
      return { text: jsonString, timestamp: new Date().toISOString() };
    } catch {
      return { text: jsonString, timestamp: new Date().toISOString() };
    }
  } catch (err) {
    // Authenticated decryption failed (integrity violation, wrong key, or corrupt data)
    throw new Error('Decryption failed: Message integrity check failed or invalid encryption key.');
  }
}
