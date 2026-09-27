// ==============================================================================
// SecureTalk Supabase Realtime & Presence Service
// Handles encrypted message streams, typing broadcasts, and privacy-respecting presence
// ==============================================================================

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { DbMessage } from '../types/database';

export interface RealtimeMessageCallbacks {
  onNewMessage?: (msg: DbMessage) => void;
  onMessageUpdate?: (msg: DbMessage) => void;
  onTyping?: (isTyping: boolean, userId: string) => void;
  onPresenceUpdate?: (onlineUserIds: string[]) => void;
}

export const realtimeService = {
  /**
   * Subscribes to real-time events for a specific conversation.
   * Realtime payloads contain ONLY ciphertext or ephemeral typing metadata.
   */
  subscribeToConversation(
    conversationId: string,
    currentUserId: string,
    callbacks: RealtimeMessageCallbacks
  ): RealtimeChannel {
    const channelName = `conv_${conversationId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false },
        presence: { key: currentUserId },
      },
    });

    // 1. Listen for new encrypted messages inserted in database
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (callbacks.onNewMessage) {
          callbacks.onNewMessage(payload.new as DbMessage);
        }
      }
    );

    // 2. Listen for message updates (status changed to read, soft-deleted, edited)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (callbacks.onMessageUpdate) {
          callbacks.onMessageUpdate(payload.new as DbMessage);
        }
      }
    );

    // 3. Listen for ephemeral typing indicators broadcast by partner
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      const data = payload.payload;
      if (data && data.userId !== currentUserId && callbacks.onTyping) {
        callbacks.onTyping(Boolean(data.isTyping), data.userId);
      }
    });

    // 4. Presence tracking (if user enabled online status)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const onlineUserIds = Object.keys(state);
      if (callbacks.onPresenceUpdate) {
        callbacks.onPresenceUpdate(onlineUserIds);
      }
    });

    channel.subscribe();
    return channel;
  },

  /**
   * Broadcasts typing status if user privacy settings allow it.
   */
  async broadcastTyping(channel: RealtimeChannel, userId: string, isTyping: boolean, enabled: boolean): Promise<void> {
    if (!enabled) return;
    try {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, isTyping },
      });
    } catch {
      // Ephemeral broadcast failure is non-fatal
    }
  },

  /**
   * Tracks presence on a channel if user privacy settings allow it.
   */
  async trackPresence(channel: RealtimeChannel, userId: string, enabled: boolean): Promise<void> {
    if (!enabled) return;
    try {
      await channel.track({
        online_at: new Date().toISOString(),
        userId,
      });
    } catch {
      // Presence failure is non-fatal
    }
  },

  /**
   * Safely leaves and removes a channel.
   */
  async unsubscribe(channel: RealtimeChannel): Promise<void> {
    try {
      await supabase.removeChannel(channel);
    } catch {
      // Unsubscribe cleanup
    }
  },
};
