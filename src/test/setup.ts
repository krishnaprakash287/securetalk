import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';

// Polyfill webcrypto if not attached to window or globalThis in jsdom
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
  });
}

if (typeof window !== 'undefined' && (!window.crypto || !window.crypto.subtle)) {
  Object.defineProperty(window, 'crypto', {
    value: webcrypto,
    writable: true,
  });
}
