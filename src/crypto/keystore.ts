// ==============================================================================
// SecureTalk Client-Side Key Storage
// Stores non-extractable CryptoKey objects in IndexedDB.
// Private keys never touch localStorage, servers, logs, or network payloads.
// ==============================================================================

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'securetalk_keystore_v1';
const DB_VERSION = 1;

export interface StoredIdentityRecord {
  userId: string;
  keyVersion: number;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyBase64: string;
  createdAt: string;
}

export interface StoredConversationKeyRecord {
  compositeKey: string; // `${userId}_${conversationId}`
  userId: string;
  conversationId: string;
  partnerId: string;
  partnerPublicKeyBase64: string;
  key: CryptoKey;
  createdAt: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getKeystoreDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('identity_keys')) {
          db.createObjectStore('identity_keys', { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains('conversation_keys')) {
          db.createObjectStore('conversation_keys', { keyPath: 'compositeKey' });
        }
        if (!db.objectStoreNames.contains('device_sessions')) {
          db.createObjectStore('device_sessions', { keyPath: 'sessionId' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Stores the user's local cryptographic identity key pair in IndexedDB.
 */
export async function storeIdentityKeyRecord(record: StoredIdentityRecord): Promise<void> {
  const db = await getKeystoreDB();
  await db.put('identity_keys', record);
}

/**
 * Retrieves the user's cryptographic identity key pair from IndexedDB.
 */
export async function getIdentityKeyRecord(userId: string): Promise<StoredIdentityRecord | undefined> {
  const db = await getKeystoreDB();
  return await db.get('identity_keys', userId);
}

/**
 * Caches a derived AES-256-GCM conversation key in IndexedDB.
 */
export async function storeConversationKey(
  userId: string,
  conversationId: string,
  partnerId: string,
  partnerPublicKeyBase64: string,
  key: CryptoKey
): Promise<void> {
  const db = await getKeystoreDB();
  const compositeKey = `${userId}_${conversationId}`;
  const record: StoredConversationKeyRecord = {
    compositeKey,
    userId,
    conversationId,
    partnerId,
    partnerPublicKeyBase64,
    key,
    createdAt: new Date().toISOString(),
  };
  await db.put('conversation_keys', record);
}

/**
 * Retrieves a cached conversation key from IndexedDB.
 */
export async function getConversationKey(
  userId: string,
  conversationId: string
): Promise<CryptoKey | null> {
  const db = await getKeystoreDB();
  const compositeKey = `${userId}_${conversationId}`;
  const record = await db.get('conversation_keys', compositeKey);
  return record ? (record.key as CryptoKey) : null;
}

/**
 * Retrieves full conversation key record including partner's public key hash.
 */
export async function getConversationKeyRecord(
  userId: string,
  conversationId: string
): Promise<StoredConversationKeyRecord | undefined> {
  const db = await getKeystoreDB();
  const compositeKey = `${userId}_${conversationId}`;
  return await db.get('conversation_keys', compositeKey);
}

/**
 * Removes a specific conversation key from cache.
 */
export async function deleteConversationKey(
  userId: string,
  conversationId: string
): Promise<void> {
  const db = await getKeystoreDB();
  const compositeKey = `${userId}_${conversationId}`;
  await db.delete('conversation_keys', compositeKey);
}

/**
 * Removes all local cryptographic keys and caches for a specific user on logout or account deletion.
 */
export async function clearUserKeystore(userId: string): Promise<void> {
  const db = await getKeystoreDB();
  await db.delete('identity_keys', userId);
  
  // Clear conversation keys belonging to this user
  const tx = db.transaction('conversation_keys', 'readwrite');
  const store = tx.objectStore('conversation_keys');
  const allKeys = await store.getAllKeys();
  for (const key of allKeys) {
    if (typeof key === 'string' && key.startsWith(`${userId}_`)) {
      await store.delete(key);
    }
  }
  await tx.done;
}

/**
 * Complete wipe of the IndexedDB keystore.
 */
export async function wipeEntireKeystore(): Promise<void> {
  const db = await getKeystoreDB();
  await db.clear('identity_keys');
  await db.clear('conversation_keys');
  await db.clear('device_sessions');
}
