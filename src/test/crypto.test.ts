// ==============================================================================
// SecureTalk Cryptographic & Security Unit Tests
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateIdentityKeyPair,
  exportPublicKeySpki,
  importPublicKeySpki,
  deriveConversationKey,
  computeSafetyNumber,
  encryptMessage,
  decryptMessage,
  encryptAttachmentFile,
  decryptAttachmentFile,
  base64ToBuffer,
  bufferToBase64,
  storeIdentityKeyRecord,
  getIdentityKeyRecord,
  storeConversationKey,
  getConversationKey,
  wipeEntireKeystore,
} from '../crypto';

describe('SecureTalk Cryptographic Core', () => {
  beforeEach(async () => {
    await wipeEntireKeystore();
  });

  describe('1. ECDH Key Agreement & Export/Import', () => {
    it('generates valid P-256 ECDH key pairs and exports/imports SPKI', async () => {
      const keyPair = await generateIdentityKeyPair();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();

      const exportedSpki = await exportPublicKeySpki(keyPair.publicKey);
      expect(typeof exportedSpki).toBe('string');
      expect(exportedSpki.length).toBeGreaterThan(50);

      const importedKey = await importPublicKeySpki(exportedSpki);
      expect(importedKey.algorithm.name).toBe('ECDH');
    });

    it('derives the identical 256-bit AES-GCM conversation key for both participants', async () => {
      // Alice generates keypair
      const aliceKeyPair = await generateIdentityKeyPair();
      const alicePubSpki = await exportPublicKeySpki(aliceKeyPair.publicKey);

      // Bob generates keypair
      const bobKeyPair = await generateIdentityKeyPair();
      const bobPubSpki = await exportPublicKeySpki(bobKeyPair.publicKey);

      // Alice imports Bob's public key
      const importedBobPub = await importPublicKeySpki(bobPubSpki);
      // Bob imports Alice's public key
      const importedAlicePub = await importPublicKeySpki(alicePubSpki);

      // Derive keys
      const aliceDerivedKey = await deriveConversationKey(aliceKeyPair.privateKey, importedBobPub);
      const bobDerivedKey = await deriveConversationKey(bobKeyPair.privateKey, importedAlicePub);

      // Both derived keys must encrypt/decrypt each other's messages
      const secret = 'Confidential message between Alice and Bob.';
      const encryptedByAlice = await encryptMessage(secret, aliceDerivedKey);
      const decryptedByBob = await decryptMessage(encryptedByAlice, bobDerivedKey);

      expect(decryptedByBob.text).toBe(secret);
    });
  });

  describe('2. Authenticated Encryption & Tamper Detection', () => {
    it('encrypts and decrypts message payload round-trip', async () => {
      const aliceKeyPair = await generateIdentityKeyPair();
      const bobKeyPair = await generateIdentityKeyPair();
      const key = await deriveConversationKey(aliceKeyPair.privateKey, bobKeyPair.publicKey);

      const plaintext = 'Hello, this is a privacy-first message.';
      const encrypted = await encryptMessage(plaintext, key);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.nonce).toBeDefined();
      expect(encrypted.encryption_version).toBe(1);

      const decrypted = await decryptMessage(encrypted, key);
      expect(decrypted.text).toBe(plaintext);
    });

    it('FAILS decryption when changing a single byte of ciphertext (Tamper Evident)', async () => {
      const aliceKeyPair = await generateIdentityKeyPair();
      const bobKeyPair = await generateIdentityKeyPair();
      const key = await deriveConversationKey(aliceKeyPair.privateKey, bobKeyPair.publicKey);

      const encrypted = await encryptMessage('Sensitive intelligence data', key);

      // Tamper with the ciphertext by flipping one byte
      const rawCiphertext = base64ToBuffer(encrypted.ciphertext);
      const tamperedBytes = new Uint8Array(rawCiphertext);
      tamperedBytes[5] = tamperedBytes[5] ^ 0x01; // flip 1 bit
      const tamperedCiphertext = bufferToBase64(tamperedBytes);

      const tamperedPayload = {
        ciphertext: tamperedCiphertext,
        nonce: encrypted.nonce,
        encryption_version: 1,
      };

      await expect(decryptMessage(tamperedPayload, key)).rejects.toThrow(
        /Decryption failed: Message integrity check failed/
      );
    });

    it('FAILS decryption when nonce/IV is modified', async () => {
      const aliceKeyPair = await generateIdentityKeyPair();
      const bobKeyPair = await generateIdentityKeyPair();
      const key = await deriveConversationKey(aliceKeyPair.privateKey, bobKeyPair.publicKey);

      const encrypted = await encryptMessage('Another test message', key);

      const rawNonce = base64ToBuffer(encrypted.nonce);
      rawNonce[0] = rawNonce[0] ^ 0xff; // corrupt nonce
      const tamperedNonce = bufferToBase64(rawNonce);

      const tamperedPayload = {
        ciphertext: encrypted.ciphertext,
        nonce: tamperedNonce,
        encryption_version: 1,
      };

      await expect(decryptMessage(tamperedPayload, key)).rejects.toThrow(
        /Decryption failed: Message integrity check failed/
      );
    });

    it('FAILS decryption when decrypted with the wrong key (Unauthorized Party)', async () => {
      const aliceKeyPair = await generateIdentityKeyPair();
      const bobKeyPair = await generateIdentityKeyPair();
      const eveKeyPair = await generateIdentityKeyPair(); // Third party

      const aliceBobKey = await deriveConversationKey(aliceKeyPair.privateKey, bobKeyPair.publicKey);
      const eveAliceKey = await deriveConversationKey(eveKeyPair.privateKey, aliceKeyPair.publicKey);

      const encrypted = await encryptMessage('Private message for Bob only', aliceBobKey);

      // Eve attempts to decrypt with her key
      await expect(decryptMessage(encrypted, eveAliceKey)).rejects.toThrow(
        /Decryption failed: Message integrity check failed/
      );
    });
  });

  describe('3. Safety Number (Fingerprint) Verification', () => {
    it('computes deterministic, order-independent safety numbers', async () => {
      const pubKeyA = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEUserAKeySample...';
      const pubKeyB = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEUserBKeySample...';

      const fingerprintAB = await computeSafetyNumber(pubKeyA, pubKeyB);
      const fingerprintBA = await computeSafetyNumber(pubKeyB, pubKeyA);

      expect(fingerprintAB).toBe(fingerprintBA);
      expect(fingerprintAB.split(' ').length).toBe(6);
      expect(fingerprintAB).toMatch(/^(\d{5}\s){5}\d{5}$/);
    });
  });

  describe('4. Client-Side Attachment Encryption & Decryption', () => {
    it('encrypts attachment locally with ephemeral key and decrypts successfully', async () => {
      const aliceKeyPair = await generateIdentityKeyPair();
      const bobKeyPair = await generateIdentityKeyPair();
      const conversationKey = await deriveConversationKey(aliceKeyPair.privateKey, bobKeyPair.publicKey);

      const testContent = 'Document content: Top secret financial data and analysis.';
      const testBlob = new Blob([testContent], { type: 'text/plain' });
      const testFile = new File([testBlob], 'confidential.txt', { type: 'text/plain' });

      // Encrypt attachment
      const encryptedPayload = await encryptAttachmentFile(testFile, conversationKey);
      expect(encryptedPayload.encryptedBlob).toBeDefined();
      expect(encryptedPayload.encryptedBlob.type).toBe('application/octet-stream');
      expect(encryptedPayload.encryptedFileKey).toBeDefined();
      expect(encryptedPayload.fileNonce).toBeDefined();

      // Download / Decrypt attachment
      const encryptedBytes = await encryptedPayload.encryptedBlob.arrayBuffer();
      const decrypted = await decryptAttachmentFile(
        encryptedBytes,
        {
          encryptedFileKey: encryptedPayload.encryptedFileKey,
          fileNonce: encryptedPayload.fileNonce,
          originalFilenameCiphertext: encryptedPayload.originalFilenameCiphertext,
          mimeType: encryptedPayload.mimeType,
        },
        conversationKey
      );

      expect(decrypted.originalFilename).toBe('confidential.txt');
      const decryptedText = await decrypted.decryptedBlob.text();
      expect(decryptedText).toBe(testContent);
    });
  });

  describe('5. IndexedDB Key Store', () => {
    it('stores and retrieves identity keys and conversation keys', async () => {
      const keyPair = await generateIdentityKeyPair();
      const pubSpki = await exportPublicKeySpki(keyPair.publicKey);

      const userId = 'user-test-uuid-1234';
      await storeIdentityKeyRecord({
        userId,
        keyVersion: 1,
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        publicKeyBase64: pubSpki,
        createdAt: new Date().toISOString(),
      });

      const retrieved = await getIdentityKeyRecord(userId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.userId).toBe(userId);
      expect(retrieved?.publicKeyBase64).toBe(pubSpki);

      // Conversation key caching
      const convId = 'conv-test-uuid-9999';
      const bobKeyPair = await generateIdentityKeyPair();
      const convKey = await deriveConversationKey(keyPair.privateKey, bobKeyPair.publicKey);

      await storeConversationKey(userId, convId, 'bob-id', 'bob-pubkey', convKey);
      const retrievedConvKey = await getConversationKey(userId, convId);
      expect(retrievedConvKey).toBeDefined();
    });
  });
});
