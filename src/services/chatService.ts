// ==============================================================================
// SecureTalk Real-Time Chat & End-to-End Encryption Service
// All messages and attachments are encrypted locally BEFORE server transmission
// ==============================================================================

import { supabase } from '../lib/supabase';
import {
  generateIdentityKeyPair,
  exportPublicKeySpki,
  storeIdentityKeyRecord,
  getIdentityKeyRecord,
  importPublicKeySpki,
  deriveConversationKey,
  getConversationKey,
  getConversationKeyRecord,
  storeConversationKey,
  deleteConversationKey,
  encryptMessage,
  decryptMessage,
  encryptAttachmentFile,
  decryptAttachmentFile,
  computeSafetyNumber,
} from '../crypto';
import { sanitizeErrorMessage } from '../utils/errors';
import type {
  ConversationWithDetails,
  ChatRequest,
  DbMessage,
  DbAttachment,
  Profile,
} from '../types/database';
import type { DecryptedMessage, DecryptedAttachmentMeta } from '../crypto/types';

export const chatService = {
  /**
   * Retrieves or derives the 256-bit AES-GCM conversation key.
   * Proactively verifies partner's public key matches the cached key; auto-re-derives if updated.
   */
  async getConversationKey(userId: string, conversationId: string, partnerId: string): Promise<CryptoKey> {
    // 1. Ensure local user's cryptographic identity key exists on this device
    let localIdentity = await getIdentityKeyRecord(userId);
    if (!localIdentity?.privateKey) {
      // Auto-heal missing identity key on current device
      const newKeyPair = await generateIdentityKeyPair();
      const pubSpki = await exportPublicKeySpki(newKeyPair.publicKey);
      localIdentity = {
        userId,
        keyVersion: 1,
        privateKey: newKeyPair.privateKey,
        publicKey: newKeyPair.publicKey,
        publicKeyBase64: pubSpki,
        createdAt: new Date().toISOString(),
      };
      await storeIdentityKeyRecord(localIdentity);

      await supabase.from('public_keys').upsert(
        {
          user_id: userId,
          public_key: pubSpki,
          key_version: 1,
        },
        { onConflict: 'user_id,key_version' }
      );
    } else {
      // Proactively ensure our public key in Supabase matches our local private key
      supabase.from('public_keys').upsert(
        {
          user_id: userId,
          public_key: localIdentity.publicKeyBase64,
          key_version: 1,
        },
        { onConflict: 'user_id,key_version' }
      ).then();
    }

    // 2. Fetch partner's latest public key from Supabase
    const { data: partnerKeyRecord, error: keyError } = await supabase
      .from('public_keys')
      .select('public_key, key_version')
      .eq('user_id', partnerId)
      .order('key_version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (keyError || !partnerKeyRecord?.public_key) {
      throw new Error('Unable to retrieve recipient public key for secure key exchange.');
    }

    // 3. Check local IndexedDB cache; if cached key matches partner's public key, return it
    const cachedRecord = await getConversationKeyRecord(userId, conversationId);
    if (cachedRecord && cachedRecord.partnerPublicKeyBase64 === partnerKeyRecord.public_key) {
      return cachedRecord.key;
    }

    // 4. Import partner's public key
    const partnerPublicKey = await importPublicKeySpki(partnerKeyRecord.public_key);

    // 5. Perform ECDH key exchange + HKDF expansion
    const derivedKey = await deriveConversationKey(localIdentity.privateKey, partnerPublicKey);

    // 6. Cache derived key in IndexedDB with partner's public key fingerprint
    await storeConversationKey(userId, conversationId, partnerId, partnerKeyRecord.public_key, derivedKey);

    return derivedKey;
  },

  /**
   * Forces re-derivation of a conversation key by clearing the cache.
   */
  async rederiveConversationKey(userId: string, conversationId: string, partnerId: string): Promise<CryptoKey> {
    await deleteConversationKey(userId, conversationId);
    return await this.getConversationKey(userId, conversationId, partnerId);
  },

  /**
   * Computes the human-verifiable Safety Number for a conversation.
   */
  async getConversationSafetyNumber(userId: string, partnerId: string): Promise<string> {
    const localIdentity = await getIdentityKeyRecord(userId);
    const { data: partnerKeyRecord } = await supabase
      .from('public_keys')
      .select('public_key')
      .eq('user_id', partnerId)
      .order('key_version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!localIdentity?.publicKeyBase64 || !partnerKeyRecord?.public_key) {
      return 'Verification pending key exchange';
    }

    return await computeSafetyNumber(localIdentity.publicKeyBase64, partnerKeyRecord.public_key);
  },

  /**
   * Fetches all active conversations for the current user.
   */
  async getConversations(userId: string): Promise<ConversationWithDetails[]> {
    // Fetch conversations where user is a member
    const { data: userMemberships, error: memberError } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);

    if (memberError || !userMemberships || userMemberships.length === 0) {
      return [];
    }

    const conversationIds = userMemberships.map((m) => m.conversation_id);

    // Fetch conversation details and other members
    const { data: allMembers, error: allMembersError } = await supabase
      .from('conversation_members')
      .select('conversation_id, joined_at, profile:profiles(id, username, display_name, avatar_url, bio, created_at, updated_at)')
      .in('conversation_id', conversationIds);

    if (allMembersError) {
      throw new Error(sanitizeErrorMessage(allMembersError));
    }

    const conversationsMap = new Map<string, ConversationWithDetails>();

    for (const id of conversationIds) {
      const partnerMember = allMembers?.find(
        (m: any) => m.conversation_id === id && m.profile?.id !== userId
      );

      if (partnerMember && partnerMember.profile) {
        conversationsMap.set(id, {
          id,
          created_at: partnerMember.joined_at,
          updated_at: partnerMember.joined_at,
          otherMember: partnerMember.profile as unknown as Profile,
          lastMessage: null,
          unreadCount: 0,
        });
      }
    }

    // Fetch latest messages and unread counts for each conversation
    const result: ConversationWithDetails[] = [];
    for (const [convId, conv] of conversationsMap.entries()) {
      try {
        const { data: messages } = await supabase
          .from('messages')
          .select('id, sender_id, ciphertext, nonce, encryption_version, status, created_at, deleted_at')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(1);

        // Count unread
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .neq('sender_id', userId)
          .neq('status', 'read');

        conv.unreadCount = unreadCount || 0;

        if (messages && messages.length > 0) {
          const lastMsg = messages[0];
          if (lastMsg.deleted_at) {
            conv.lastMessage = {
              text: 'Message deleted',
              createdAt: lastMsg.created_at,
              senderId: lastMsg.sender_id,
            };
          } else {
            // Attempt preview decryption
            try {
              const convKey = await this.getConversationKey(userId, convId, conv.otherMember.id);
              const decrypted = await decryptMessage(lastMsg, convKey);
              conv.lastMessage = {
                text: decrypted.text,
                createdAt: lastMsg.created_at,
                senderId: lastMsg.sender_id,
              };
            } catch {
              conv.lastMessage = {
                text: 'Encrypted message',
                createdAt: lastMsg.created_at,
                senderId: lastMsg.sender_id,
              };
            }
          }
        }
      } catch {
        // Fallback for conversation preview
      }
      result.push(conv);
    }

    // Sort by latest message date or created date
    return result.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || a.created_at;
      const timeB = b.lastMessage?.createdAt || b.created_at;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });
  },

  /**
   * Fetches messages in a conversation and decrypts them client-side.
   */
  async getMessages(
    conversationId: string,
    userId: string,
    partnerId: string,
    limit = 60
  ): Promise<DecryptedMessage[]> {
    // 1. Fetch raw ciphertext messages from Supabase
    const { data: rawMessages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (msgError) throw new Error(sanitizeErrorMessage(msgError));
    if (!rawMessages || rawMessages.length === 0) return [];

    // 2. Fetch attachments for these messages
    const messageIds = rawMessages.map((m) => m.id);
    const { data: rawAttachments } = await supabase
      .from('attachments')
      .select('*')
      .in('message_id', messageIds);

    const attachmentsByMessage = new Map<string, DbAttachment[]>();
    if (rawAttachments) {
      for (const att of rawAttachments) {
        const list = attachmentsByMessage.get(att.message_id) || [];
        list.push(att);
        attachmentsByMessage.set(att.message_id, list);
      }
    }

    // 3. Derive/retrieve conversation key
    let conversationKey = await this.getConversationKey(userId, conversationId, partnerId);

    // 4. Decrypt each message locally
    const decryptedList: DecryptedMessage[] = [];

    for (const msg of rawMessages) {
      if (msg.deleted_at) {
        decryptedList.push({
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          text: 'This message was deleted.',
          status: msg.status,
          replyToId: msg.reply_to_id,
          createdAt: msg.created_at,
          editedAt: msg.edited_at,
          deletedAt: msg.deleted_at,
          attachments: [],
        });
        continue;
      }

      let plaintext = '';
      try {
        const decrypted = await decryptMessage(msg, conversationKey);
        plaintext = decrypted.text;
      } catch {
        // Attempt immediate re-derivation in case partner's key was refreshed
        try {
          const freshKey = await this.rederiveConversationKey(userId, conversationId, partnerId);
          const decrypted = await decryptMessage(msg, freshKey);
          plaintext = decrypted.text;
          conversationKey = freshKey;
        } catch (err) {
          console.warn('[E2EE Decrypt Failure]', { msgId: msg.id, senderId: msg.sender_id, error: err });
          plaintext = 'Decryption failed: cryptographic integrity check failed.';
        }
      }

      // Prepare attachment placeholders
      const atts = attachmentsByMessage.get(msg.id) || [];
      const decryptedAttachments: DecryptedAttachmentMeta[] = atts.map((att) => ({
        id: att.id,
        filePath: att.file_path,
        fileName: 'Encrypted attachment', // Decrypted on demand or during preview
        fileSize: att.file_size,
        mimeType: att.mime_type,
      }));

      decryptedList.push({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        text: plaintext,
        status: msg.status,
        replyToId: msg.reply_to_id,
        createdAt: msg.created_at,
        editedAt: msg.edited_at,
        deletedAt: null,
        attachments: decryptedAttachments,
      });
    }

    return decryptedList;
  },

  /**
   * Encrypts and transmits a new message.
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    partnerId: string,
    text: string,
    replyToId?: string | null
  ): Promise<DecryptedMessage> {
    // 1. Get conversation key
    const conversationKey = await this.getConversationKey(senderId, conversationId, partnerId);

    // 2. Encrypt plaintext payload client-side
    const encrypted = await encryptMessage(
      {
        text,
        timestamp: new Date().toISOString(),
        replyToId: replyToId || null,
      },
      conversationKey
    );

    // 3. Insert ciphertext into Supabase
    const { data: newMsg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        encryption_version: encrypted.encryption_version,
        reply_to_id: replyToId || null,
        status: 'sent',
      })
      .select()
      .single();

    if (error) {
      throw new Error(sanitizeErrorMessage(error));
    }

    return {
      id: newMsg.id,
      conversationId: newMsg.conversation_id,
      senderId: newMsg.sender_id,
      text,
      status: 'sent',
      replyToId: newMsg.reply_to_id,
      createdAt: newMsg.created_at,
      editedAt: null,
      deletedAt: null,
      attachments: [],
    };
  },

  /**
   * Encrypts and uploads an attachment, then records it in the database.
   */
  async sendEncryptedAttachment(
    conversationId: string,
    senderId: string,
    partnerId: string,
    file: File
  ): Promise<DecryptedMessage> {
    // 1. Get conversation key
    const conversationKey = await this.getConversationKey(senderId, conversationId, partnerId);

    // 2. Encrypt attachment locally on the device
    const encryptedAttachment = await encryptAttachmentFile(file, conversationKey);

    // 3. Upload encrypted binary blob to Supabase Storage
    const storagePath = `${conversationId}/${Date.now()}_${crypto.randomUUID()}.bin`;
    const { error: uploadError } = await supabase.storage
      .from('encrypted-attachments')
      .upload(storagePath, encryptedAttachment.encryptedBlob, {
        contentType: 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(sanitizeErrorMessage(uploadError));
    }

    // 4. Send encrypted message placeholder
    const encryptedMsg = await encryptMessage(
      {
        text: `[Attachment: ${file.name}]`,
        timestamp: new Date().toISOString(),
      },
      conversationKey
    );

    const { data: newMsg, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        ciphertext: encryptedMsg.ciphertext,
        nonce: encryptedMsg.nonce,
        encryption_version: encryptedMsg.encryption_version,
        status: 'sent',
      })
      .select()
      .single();

    if (msgError) {
      throw new Error(sanitizeErrorMessage(msgError));
    }

    // 5. Store attachment metadata
    const { data: attRecord, error: attError } = await supabase
      .from('attachments')
      .insert({
        message_id: newMsg.id,
        file_path: storagePath,
        file_size: encryptedAttachment.fileSize,
        mime_type: encryptedAttachment.mimeType,
        encrypted_file_key: encryptedAttachment.encryptedFileKey,
        file_nonce: encryptedAttachment.fileNonce,
        original_filename_ciphertext: encryptedAttachment.originalFilenameCiphertext,
      })
      .select()
      .single();

    if (attError) {
      throw new Error(sanitizeErrorMessage(attError));
    }

    return {
      id: newMsg.id,
      conversationId: newMsg.conversation_id,
      senderId: newMsg.sender_id,
      text: `[Attachment: ${file.name}]`,
      status: 'sent',
      replyToId: null,
      createdAt: newMsg.created_at,
      editedAt: null,
      deletedAt: null,
      attachments: [
        {
          id: attRecord.id,
          filePath: attRecord.file_path,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        },
      ],
    };
  },

  /**
   * Downloads and decrypts an attachment locally into an object URL.
   */
  async downloadAndDecryptAttachment(
    attachmentId: string,
    conversationId: string,
    userId: string,
    partnerId: string
  ): Promise<{ blobUrl: string; fileName: string; mimeType: string }> {
    // 1. Fetch attachment record
    const { data: att, error: attError } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (attError || !att) {
      throw new Error('Attachment metadata not found.');
    }

    // 2. Download encrypted blob from Supabase Storage
    const { data: encryptedData, error: downloadError } = await supabase.storage
      .from('encrypted-attachments')
      .download(att.file_path);

    if (downloadError || !encryptedData) {
      throw new Error(sanitizeErrorMessage(downloadError));
    }

    // 3. Get conversation key
    const conversationKey = await this.getConversationKey(userId, conversationId, partnerId);

    // 4. Decrypt attachment locally
    const arrayBuffer = await encryptedData.arrayBuffer();
    const decrypted = await decryptAttachmentFile(
      arrayBuffer,
      {
        encryptedFileKey: att.encrypted_file_key,
        fileNonce: att.file_nonce,
        originalFilenameCiphertext: att.original_filename_ciphertext,
        mimeType: att.mime_type,
      },
      conversationKey
    );

    return {
      blobUrl: decrypted.blobUrl,
      fileName: decrypted.originalFilename,
      mimeType: att.mime_type,
    };
  },

  /**
   * Marks unread messages in a conversation as read.
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .neq('status', 'read');
  },

  /**
   * Soft-deletes a message.
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .match({ id: messageId, sender_id: userId });

    if (error) throw new Error(sanitizeErrorMessage(error));
  },

  // ----------------------------------------------------------------------------
  // CHAT REQUESTS
  // ----------------------------------------------------------------------------

  /**
   * Fetches pending and previous chat requests.
   */
  async getChatRequests(userId: string): Promise<{ incoming: ChatRequest[]; outgoing: ChatRequest[] }> {
    const { data, error } = await supabase
      .from('chat_requests')
      .select(`
        id, sender_id, recipient_id, status, created_at, updated_at,
        sender:profiles!chat_requests_sender_id_fkey(id, username, display_name, avatar_url, bio, created_at, updated_at),
        recipient:profiles!chat_requests_recipient_id_fkey(id, username, display_name, avatar_url, bio, created_at, updated_at)
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(sanitizeErrorMessage(error));

    const incoming: ChatRequest[] = [];
    const outgoing: ChatRequest[] = [];

    for (const req of (data || []) as unknown as ChatRequest[]) {
      if (req.recipient_id === userId) {
        incoming.push(req);
      } else {
        outgoing.push(req);
      }
    }

    return { incoming, outgoing };
  },

  /**
   * Sends a chat request to a recipient.
   */
  async sendChatRequest(senderId: string, recipientId: string): Promise<ChatRequest> {
    const { data, error } = await supabase
      .from('chat_requests')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('unique constraint')) {
        throw new Error('A chat request with this user already exists.');
      }
      throw new Error(sanitizeErrorMessage(error));
    }

    return data;
  },

  /**
   * Accepts a chat request and creates the conversation.
   */
  async acceptChatRequest(requestId: string): Promise<string> {
    const { data: convId, error } = await supabase.rpc('accept_chat_request', {
      request_id: requestId,
    });

    if (error) {
      throw new Error(sanitizeErrorMessage(error));
    }

    return convId;
  },

  /**
   * Rejects a chat request.
   */
  async rejectChatRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw new Error(sanitizeErrorMessage(error));
  },

  /**
   * Cancels an outgoing chat request.
   */
  async cancelChatRequest(requestId: string, senderId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_requests')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .match({ id: requestId, sender_id: senderId });

    if (error) throw new Error(sanitizeErrorMessage(error));
  },
};
