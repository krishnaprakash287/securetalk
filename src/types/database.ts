// ==============================================================================
// SecureTalk Database Schema Types
// ==============================================================================

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  read_receipts: boolean;
  typing_indicators: boolean;
  online_status: boolean;
  last_seen: boolean;
  allow_chat_requests: boolean;
  profile_discoverable: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicKeyRecord {
  id: string;
  user_id: string;
  public_key: string; // Base64 SPKI
  key_version: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface ConversationWithDetails extends Conversation {
  otherMember: Profile;
  lastMessage?: {
    text: string;
    createdAt: string;
    senderId: string;
    isAttachment?: boolean;
  } | null;
  unreadCount: number;
}

export type ChatRequestStatus = 'pending' | 'accepted' | 'rejected' | 'canceled' | 'blocked';

export interface ChatRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: ChatRequestStatus;
  created_at: string;
  updated_at: string;
  sender?: Profile;
  recipient?: Profile;
}

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  ciphertext: string;
  nonce: string;
  encryption_version: number;
  recipient_key_fingerprint: string | null;
  reply_to_id: string | null;
  status: MessageDeliveryStatus;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

export interface DbAttachment {
  id: string;
  message_id: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  encrypted_file_key: string;
  file_nonce: string;
  original_filename_ciphertext: string;
  created_at: string;
}

export interface BlockedUser {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  profile?: Profile;
}

export interface DeviceSession {
  id: string;
  user_id: string;
  device_name: string;
  device_type: string | null;
  last_active: string;
  created_at: string;
  isCurrent?: boolean;
}
