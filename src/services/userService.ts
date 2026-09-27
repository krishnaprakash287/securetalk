// ==============================================================================
// SecureTalk User Discovery, Profiles, Settings & Blocking Service
// Privacy-first: strictly hides email addresses, phone numbers, and private keys
// ==============================================================================

import { supabase } from '../lib/supabase';
import { normalizeUsername } from '../utils/validation';
import { sanitizeErrorMessage } from '../utils/errors';
import type { Profile, UserSettings, BlockedUser, DeviceSession } from '../types/database';

export const userService = {
  /**
   * Searches for users strictly by @username.
   * Never exposes email addresses or phone numbers.
   */
  async searchUsers(query: string, currentUserId: string): Promise<Profile[]> {
    const cleanQuery = normalizeUsername(query);
    if (!cleanQuery || cleanQuery.length < 2) return [];

    // Query profiles matching prefix or substring
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, created_at, updated_at')
      .ilike('username', `%${cleanQuery}%`)
      .neq('id', currentUserId)
      .limit(20);

    if (error) {
      throw new Error(sanitizeErrorMessage(error));
    }

    // Filter out users who have blocked the current user or who the current user blocked
    const { data: blocks } = await supabase
      .from('blocked_users')
      .select('blocked_id, blocker_id')
      .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);

    const blockedIds = new Set<string>();
    if (blocks) {
      for (const b of blocks) {
        if (b.blocker_id === currentUserId) blockedIds.add(b.blocked_id);
        if (b.blocked_id === currentUserId) blockedIds.add(b.blocker_id);
      }
    }

    return (data || []).filter((p) => !blockedIds.has(p.id));
  },

  /**
   * Fetches public profile by username.
   */
  async getProfileByUsername(username: string): Promise<Profile | null> {
    const clean = normalizeUsername(username);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, created_at, updated_at')
      .eq('username', clean)
      .maybeSingle();

    if (error) throw new Error(sanitizeErrorMessage(error));
    return data;
  },

  /**
   * Fetches public profile by user ID.
   */
  async getProfileById(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw new Error(sanitizeErrorMessage(error));
    return data;
  },

  /**
   * Updates current user's profile details.
   */
  async updateProfile(userId: string, updates: Partial<Pick<Profile, 'display_name' | 'bio' | 'avatar_url'>>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(sanitizeErrorMessage(error));
    return data;
  },

  /**
   * Fetches user privacy settings.
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(sanitizeErrorMessage(error));
    if (!data) {
      // Default fallback
      return {
        user_id: userId,
        read_receipts: true,
        typing_indicators: true,
        online_status: true,
        last_seen: true,
        allow_chat_requests: true,
        profile_discoverable: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    return data;
  },

  /**
   * Updates user privacy settings.
   */
  async updateUserSettings(userId: string, settings: Partial<Omit<UserSettings, 'user_id' | 'created_at'>>): Promise<UserSettings> {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(sanitizeErrorMessage(error));
    return data;
  },

  /**
   * Fetches list of users blocked by current user.
   */
  async getBlockedUsers(currentUserId: string): Promise<BlockedUser[]> {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id, created_at, profile:profiles!blocked_users_blocked_id_fkey(id, username, display_name, avatar_url, bio, created_at, updated_at)')
      .eq('blocker_id', currentUserId);

    if (error) throw new Error(sanitizeErrorMessage(error));
    return (data || []).map((item: any) => ({
      blocker_id: item.blocker_id,
      blocked_id: item.blocked_id,
      created_at: item.created_at,
      profile: item.profile,
    }));
  },

  /**
   * Blocks another user.
   */
  async blockUser(currentUserId: string, targetUserId: string): Promise<void> {
    if (currentUserId === targetUserId) throw new Error('Cannot block yourself.');

    const { error } = await supabase
      .from('blocked_users')
      .insert({
        blocker_id: currentUserId,
        blocked_id: targetUserId,
      });

    if (error && !error.message.includes('unique constraint')) {
      throw new Error(sanitizeErrorMessage(error));
    }
  },

  /**
   * Unblocks a previously blocked user.
   */
  async unblockUser(currentUserId: string, targetUserId: string): Promise<void> {
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .match({ blocker_id: currentUserId, blocked_id: targetUserId });

    if (error) throw new Error(sanitizeErrorMessage(error));
  },

  /**
   * Fetches active sessions/devices for current user.
   */
  async getDevices(currentUserId: string): Promise<DeviceSession[]> {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', currentUserId)
        .order('last_active', { ascending: false });

      if (error) {
        console.warn('Devices fetch warning:', error.message);
        return [
          {
            id: 'current-session',
            user_id: currentUserId,
            device_name: 'Current Browser Session',
            device_type: 'desktop',
            last_active: new Date().toISOString(),
            created_at: new Date().toISOString(),
            isCurrent: true,
          },
        ];
      }
      return data && data.length > 0
        ? data
        : [
            {
              id: 'current-session',
              user_id: currentUserId,
              device_name: 'Current Browser Session',
              device_type: 'desktop',
              last_active: new Date().toISOString(),
              created_at: new Date().toISOString(),
              isCurrent: true,
            },
          ];
    } catch {
      return [];
    }
  },

  /**
   * Revokes / removes a device session.
   */
  async removeDevice(deviceId: string, currentUserId: string): Promise<void> {
    if (deviceId === 'current-session') return;
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .match({ id: deviceId, user_id: currentUserId });

      if (error) throw new Error(sanitizeErrorMessage(error));
    } catch (err) {
      console.warn('Device remove warning:', err);
    }
  },
};
