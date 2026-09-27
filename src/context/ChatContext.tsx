// ==============================================================================
// SecureTalk Chat Context
// Manages global conversations list, unread indicators, and incoming chat requests
// ==============================================================================

import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { chatService } from '../services/chatService';
import { supabase } from '../lib/supabase';
import type { ConversationWithDetails } from '../types/database';

interface ChatContextType {
  conversations: ConversationWithDetails[];
  loadingConversations: boolean;
  pendingRequestsCount: number;
  refreshConversations: () => Promise<void>;
  refreshRequestsCount: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingConversations(true);
      const convs = await chatService.getConversations(user.id);
      setConversations(convs);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  const refreshRequestsCount = useCallback(async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('chat_requests')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('status', 'pending');
      setPendingRequestsCount(count || 0);
    } catch {
      // Non-fatal
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setPendingRequestsCount(0);
      return;
    }

    refreshConversations();
    refreshRequestsCount();

    // Listen for global chat request events
    const reqChannel = supabase
      .channel(`user_requests_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_requests',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          refreshRequestsCount();
          refreshConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reqChannel);
    };
  }, [user, refreshConversations, refreshRequestsCount]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        loadingConversations,
        pendingRequestsCount,
        refreshConversations,
        refreshRequestsCount,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
