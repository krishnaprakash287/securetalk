// ==============================================================================
// SecureTalk Cryptographic Utilities
// Byte conversions, constant-time comparisons, secure random generation
// ==============================================================================

/**
 * Converts an ArrayBuffer or Uint8Array to a Base64 string.
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string to a Uint8Array.
 */
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a string to a UTF-8 Uint8Array.
 */
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Converts a UTF-8 Uint8Array or ArrayBuffer to a string.
 */
export function bytesToString(buffer: ArrayBuffer | Uint8Array): string {
  return new TextDecoder().decode(buffer);
}

/**
 * Generates cryptographically secure random bytes using Web Crypto API.
 * Never uses Math.random() for security purposes.
 */
export function getSecureRandomBytes(byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Constant-time comparison of two Uint8Arrays to prevent timing attacks.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
