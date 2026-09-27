// ==============================================================================
// SecureTalk Auth Context
// Manages authentication state, user profile, and privacy settings
// ==============================================================================

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import type { Profile, UserSettings } from '../types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  settings: UserSettings | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const createFallbackProfile = (currentUser: User): Profile => {
    const rawUsername =
      currentUser.user_metadata?.username ||
      currentUser.email?.split('@')[0] ||
      `user_${currentUser.id.slice(0, 6)}`;
    const cleanUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanDisplayName =
      currentUser.user_metadata?.display_name ||
      currentUser.user_metadata?.username ||
      currentUser.email?.split('@')[0] ||
      'User';

    return {
      id: currentUser.id,
      username: cleanUsername,
      display_name: cleanDisplayName,
      avatar_url: currentUser.user_metadata?.avatar_url || null,
      bio: null,
      created_at: currentUser.created_at,
      updated_at: currentUser.updated_at || currentUser.created_at,
    };
  };

  const loadUserData = async (currentUser: User) => {
    try {
      let prof = await userService.getProfileById(currentUser.id);
      if (!prof) {
        const fallback = createFallbackProfile(currentUser);
        try {
          const { data } = await supabase
            .from('profiles')
            .upsert({
              id: currentUser.id,
              username: fallback.username,
              display_name: fallback.display_name,
            })
            .select()
            .maybeSingle();
          if (data) prof = data;
        } catch {
          // If upsert fails due to policy, keep local fallback
        }
        if (!prof) prof = fallback;
      }
      setProfile(prof);

      const userSettings = await userService.getUserSettings(currentUser.id);
      setSettings(userSettings);
    } catch (err) {
      console.error('Error loading user profile or settings:', err);
      setProfile(createFallbackProfile(currentUser));
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const prof = await userService.getProfileById(user.id);
      setProfile(prof || createFallbackProfile(user));
    } catch (err) {
      console.error('Failed to refresh profile:', err);
      setProfile(createFallbackProfile(user));
    }
  };

  const refreshSettings = async () => {
    if (!user) return;
    try {
      const s = await userService.getUserSettings(user.id);
      setSettings(s);
    } catch (err) {
      console.error('Failed to refresh settings:', err);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setProfile(null);
      setSettings(null);
    }
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await loadUserData(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setSettings(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        settings,
        loading,
        refreshProfile,
        refreshSettings,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
