// ==============================================================================
// SecureTalk Client-Side Attachment Encryption & Decryption
// Files are encrypted locally with ephemeral AES-GCM keys before upload
// ==============================================================================

import { bufferToBase64, base64ToBuffer, stringToBytes, bytesToString, getSecureRandomBytes } from './utils';
import type { EncryptedAttachmentPayload } from './types';

export const MAX_ATTACHMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'gif',
  'pdf', 'txt', 'csv', 'md', 'doc', 'docx', 'zip'
];

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Validates a file before local encryption.
 */
export function validateAttachment(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 50 MB limit (Selected: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File extension .${ext || 'unknown'} is not supported for security reasons.`,
    };
  }

  return { valid: true };
}

/**
 * Encrypts an attachment locally before it ever touches Supabase Storage.
 * Generates an ephemeral 256-bit AES-GCM key for the file, encrypts the file data,
 * and wraps the ephemeral key with the conversation key.
 */
export async function encryptAttachmentFile(
  file: File,
  conversationKey: CryptoKey
): Promise<EncryptedAttachmentPayload> {
  const validation = validateAttachment(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 1. Generate an ephemeral 256-bit AES-GCM key for this specific file
  const ephemeralFileKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 2. Export ephemeral key bytes
  const rawFileKeyBuffer = await window.crypto.subtle.exportKey('raw', ephemeralFileKey);

  // 3. Encrypt the ephemeral key with the conversationKey
  const keyWrapIv = getSecureRandomBytes(12);
  const encryptedFileKeyBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: keyWrapIv as unknown as BufferSource },
    conversationKey,
    rawFileKeyBuffer
  );

  // Pack the key wrap IV + encrypted key into one base64 payload
  const combinedKeyWrap = new Uint8Array(keyWrapIv.byteLength + encryptedFileKeyBuffer.byteLength);
  combinedKeyWrap.set(keyWrapIv, 0);
  combinedKeyWrap.set(new Uint8Array(encryptedFileKeyBuffer), keyWrapIv.byteLength);
  const encryptedFileKeyBase64 = bufferToBase64(combinedKeyWrap);

  // 4. Encrypt the original filename with conversationKey
  const nameIv = getSecureRandomBytes(12);
  const encryptedNameBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nameIv as unknown as BufferSource },
    conversationKey,
    stringToBytes(file.name) as unknown as BufferSource
  );
  const combinedName = new Uint8Array(nameIv.byteLength + encryptedNameBuffer.byteLength);
  combinedName.set(nameIv, 0);
  combinedName.set(new Uint8Array(encryptedNameBuffer), nameIv.byteLength);
  const filenameCiphertextBase64 = bufferToBase64(combinedName);

  // 5. Encrypt file binary content with the ephemeral key
  const fileBytes = await file.arrayBuffer();
  const fileNonce = getSecureRandomBytes(12);
  const encryptedFileBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: fileNonce as unknown as BufferSource, tagLength: 128 },
    ephemeralFileKey,
    fileBytes
  );

  const encryptedBlob = new Blob([encryptedFileBuffer], { type: 'application/octet-stream' });

  return {
    encryptedBlob,
    encryptedFileKey: encryptedFileKeyBase64,
    fileNonce: bufferToBase64(fileNonce),
    originalFilenameCiphertext: filenameCiphertextBase64,
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size,
  };
}

/**
 * Decrypts a downloaded encrypted attachment payload locally in the browser.
 */
export async function decryptAttachmentFile(
  encryptedData: ArrayBuffer,
  metadata: {
    encryptedFileKey: string;
    fileNonce: string;
    originalFilenameCiphertext: string;
    mimeType: string;
  },
  conversationKey: CryptoKey
): Promise<{ decryptedBlob: Blob; originalFilename: string; blobUrl: string }> {
  // 1. Unwrap the ephemeral file key using conversationKey
  const combinedKeyWrap = base64ToBuffer(metadata.encryptedFileKey);
  const keyWrapIv = combinedKeyWrap.slice(0, 12);
  const encryptedKeyBytes = combinedKeyWrap.slice(12);

  const rawFileKeyBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: keyWrapIv as unknown as BufferSource },
    conversationKey,
    encryptedKeyBytes as unknown as BufferSource
  );

  const ephemeralFileKey = await window.crypto.subtle.importKey(
    'raw',
    rawFileKeyBuffer,
    'AES-GCM',
    false,
    ['decrypt']
  );

  // 2. Decrypt original filename
  const combinedName = base64ToBuffer(metadata.originalFilenameCiphertext);
  const nameIv = combinedName.slice(0, 12);
  const encryptedNameBytes = combinedName.slice(12);

  const decryptedNameBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nameIv as unknown as BufferSource },
    conversationKey,
    encryptedNameBytes as unknown as BufferSource
  );
  const originalFilename = bytesToString(decryptedNameBuffer);

  // 3. Decrypt file payload using ephemeral file key
  const fileIv = base64ToBuffer(metadata.fileNonce);
  const decryptedFileBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fileIv as unknown as BufferSource, tagLength: 128 },
    ephemeralFileKey,
    encryptedData
  );

  const decryptedBlob = new Blob([decryptedFileBuffer], { type: metadata.mimeType });
  const blobUrl = URL.createObjectURL(decryptedBlob);

  return {
    decryptedBlob,
    originalFilename,
    blobUrl,
  };
}
