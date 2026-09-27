// ==============================================================================
// SecureTalk Cryptographic Types & Interfaces
// ==============================================================================

export interface EncryptedMessagePayload {
  ciphertext: string; // Base64 encoded AES-256-GCM ciphertext + 16-byte authentication tag
  nonce: string;      // Base64 encoded 12-byte IV
  encryption_version: number;
}

export interface EncryptedAttachmentPayload {
  encryptedBlob: Blob;
  encryptedFileKey: string;      // Ephemeral AES key encrypted using conversation key
  fileNonce: string;             // Base64 IV used for file payload
  originalFilenameCiphertext: string; // Encrypted filename
  mimeType: string;
  fileSize: number;
}

export interface StoredKeyPair {
  userId: string;
  keyVersion: number;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
  publicKeyBase64: string;
  createdAt: string;
}

export interface DecryptedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  replyToId?: string | null;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  attachments?: DecryptedAttachmentMeta[];
}

export interface DecryptedAttachmentMeta {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  blobUrl?: string;
  isDecrypting?: boolean;
}
