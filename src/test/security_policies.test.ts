// ==============================================================================
// SecureTalk Security Policy & Cryptographic Rigor Tests
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateIdentityKeyPair,
  deriveConversationKey,
  encryptMessage,
  decryptMessage,
  encryptAttachmentFile,
  decryptAttachmentFile,
  base64ToBuffer,
  bufferToBase64,
  wipeEntireKeystore,
  storeIdentityKeyRecord,
  getIdentityKeyRecord,
  clearUserKeystore,
} from '../crypto';

describe('Security Policies & Tamper Detection', () => {
  beforeEach(async () => {
    await wipeEntireKeystore();
  });

  describe('Strict 1-Byte Ciphertext Tamper Verification', () => {
    it('detects tampering at byte 0 of ciphertext', async () => {
      const alice = await generateIdentityKeyPair();
      const bob = await generateIdentityKeyPair();
      const key = await deriveConversationKey(alice.privateKey, bob.publicKey);

      const message = 'Confidential bank transfer authorization #99482';
      const enc = await encryptMessage(message, key);

      const raw = base64ToBuffer(enc.ciphertext);
      raw[0] ^= 0x01; // flip 1 bit at index 0

      await expect(
        decryptMessage({ ciphertext: bufferToBase64(raw), nonce: enc.nonce }, key)
      ).rejects.toThrow(/Decryption failed: Message integrity check failed/);
    });

    it('detects tampering at the 128-bit authentication tag (last 16 bytes)', async () => {
      const alice = await generateIdentityKeyPair();
      const bob = await generateIdentityKeyPair();
      const key = await deriveConversationKey(alice.privateKey, bob.publicKey);

      const message = 'Sensitive intelligence dispatch';
      const enc = await encryptMessage(message, key);

      const raw = base64ToBuffer(enc.ciphertext);
      // Flip bit in the authentication tag at the end
      raw[raw.length - 1] ^= 0x80;

      await expect(
        decryptMessage({ ciphertext: bufferToBase64(raw), nonce: enc.nonce }, key)
      ).rejects.toThrow(/Decryption failed: Message integrity check failed/);
    });
  });

  describe('Attachment Cryptographic Tamper Verification', () => {
    it('fails attachment decryption if any byte of the encrypted file is altered', async () => {
      const alice = await generateIdentityKeyPair();
      const bob = await generateIdentityKeyPair();
      const convKey = await deriveConversationKey(alice.privateKey, bob.publicKey);

      const fileContent = 'Sensitive blueprint data for facility layout.';
      const file = new File([fileContent], 'blueprints.pdf', { type: 'application/pdf' });

      const encAttachment = await encryptAttachmentFile(file, convKey);
      const rawBytes = await encAttachment.encryptedBlob.arrayBuffer();

      // Tamper with one byte in the encrypted file payload
      const tamperedBytes = new Uint8Array(rawBytes);
      tamperedBytes[10] ^= 0x01;

      await expect(
        decryptAttachmentFile(
          tamperedBytes.buffer,
          {
            encryptedFileKey: encAttachment.encryptedFileKey,
            fileNonce: encAttachment.fileNonce,
            originalFilenameCiphertext: encAttachment.originalFilenameCiphertext,
            mimeType: encAttachment.mimeType,
          },
          convKey
        )
      ).rejects.toThrow();
    });

    it('fails attachment decryption if the wrapped file key is tampered with', async () => {
      const alice = await generateIdentityKeyPair();
      const bob = await generateIdentityKeyPair();
      const convKey = await deriveConversationKey(alice.privateKey, bob.publicKey);

      const file = new File(['Hello'], 'test.txt', { type: 'text/plain' });
      const encAttachment = await encryptAttachmentFile(file, convKey);
      const rawBytes = await encAttachment.encryptedBlob.arrayBuffer();

      // Tamper with the encryptedFileKey base64
      const rawKeyWrap = base64ToBuffer(encAttachment.encryptedFileKey);
      rawKeyWrap[rawKeyWrap.length - 1] ^= 0x01;

      await expect(
        decryptAttachmentFile(
          rawBytes,
          {
            encryptedFileKey: bufferToBase64(rawKeyWrap),
            fileNonce: encAttachment.fileNonce,
            originalFilenameCiphertext: encAttachment.originalFilenameCiphertext,
            mimeType: encAttachment.mimeType,
          },
          convKey
        )
      ).rejects.toThrow();
    });
  });

  describe('Keystore Purge & Isolation on Logout/Account Deletion', () => {
    it('wipes user identity and cached keys upon logout/account deletion', async () => {
      const userId = 'usr-test-delete-99';
      const keyPair = await generateIdentityKeyPair();

      await storeIdentityKeyRecord({
        userId,
        keyVersion: 1,
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        publicKeyBase64: 'test-pubkey',
        createdAt: new Date().toISOString(),
      });

      // Verify stored
      const before = await getIdentityKeyRecord(userId);
      expect(before).toBeDefined();

      // Clear user keystore
      await clearUserKeystore(userId);

      // Verify purged
      const after = await getIdentityKeyRecord(userId);
      expect(after).toBeUndefined();
    });
  });
});
