// ==============================================================================
// SecureTalk Authentication Service
// Handles client-side identity key generation, registration, login, and sessions
// ==============================================================================

import { supabase } from '../lib/supabase';
import {
  generateIdentityKeyPair,
  exportPublicKeySpki,
  storeIdentityKeyRecord,
  getIdentityKeyRecord,
  clearUserKeystore,
} from '../crypto';
import { validateUsername, validatePassword, validateEmail, normalizeUsername } from '../utils/validation';
import { sanitizeErrorMessage } from '../utils/errors';
import type { Profile, UserSettings } from '../types/database';

export interface RegisterParams {
  email: string;
  username: string;
  password: string;
  displayName: string;
}

export const authService = {
  /**
   * Registers a new user with Supabase Auth and generates local cryptographic keys.
   */
  async register({ email, username, password, displayName }: RegisterParams): Promise<{ user: any; profile: Profile }> {
    // 1. Client-side input validation
    const emailVal = validateEmail(email);
    if (!emailVal.valid) throw new Error(emailVal.error);

    const userVal = validateUsername(username);
    if (!userVal.valid) throw new Error(userVal.error);

    const passVal = validatePassword(password);
    if (!passVal.valid) throw new Error(passVal.error);

    const normalizedUser = normalizeUsername(username);
    const cleanDisplayName = displayName.trim() || normalizedUser;

    // 2. Pre-check username availability
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', normalizedUser)
      .maybeSingle();

    if (checkError) {
      console.warn('Username check warning:', checkError.message);
    }
    if (existingUser) {
      throw new Error(`The username @${normalizedUser} is already taken. Please choose another.`);
    }

    // 3. Generate client-side cryptographic identity keys locally
    // The private key NEVER leaves this device!
    const keyPair = await generateIdentityKeyPair();
    const exportedPublicKey = await exportPublicKeySpki(keyPair.publicKey);

    // 4. Sign up via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          username: normalizedUser,
          display_name: cleanDisplayName,
        },
      },
    });

    if (authError || !authData.user) {
      throw new Error(sanitizeErrorMessage(authError));
    }

    const userId = authData.user.id;

    // 5. Store cryptographic identity keys in local browser IndexedDB
    await storeIdentityKeyRecord({
      userId,
      keyVersion: 1,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicKeyBase64: exportedPublicKey,
      createdAt: new Date().toISOString(),
    });

    // 6. Insert Profile record
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: normalizedUser,
        display_name: cleanDisplayName,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // 7. Insert default User Settings
    await supabase.from('user_settings').insert({
      user_id: userId,
      read_receipts: true,
      typing_indicators: true,
      online_status: true,
      last_seen: true,
      allow_chat_requests: true,
      profile_discoverable: true,
    });

    // 8. Publish the PUBLIC key only (for E2EE key agreement)
    await supabase.from('public_keys').upsert(
      {
        user_id: userId,
        public_key: exportedPublicKey,
        key_version: 1,
      },
      { onConflict: 'user_id,key_version' }
    );

    // 9. Register current device session
    await this.registerCurrentDevice(userId);

    return {
      user: authData.user,
      profile: profileData || {
        id: userId,
        username: normalizedUser,
        display_name: cleanDisplayName,
        avatar_url: null,
        bio: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  },

  /**
   * Logs in an existing user and ensures client cryptographic keys exist.
   */
  async login(email: string, password: string): Promise<{ user: any; profile: Profile }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.user) {
      throw new Error(sanitizeErrorMessage(error));
    }

    const userId = data.user.id;

    // Fetch profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      // If profile record missing, create from metadata
      const meta = data.user.user_metadata || {};
      const username = meta.username || `user_${userId.slice(0, 8)}`;
      const displayName = meta.display_name || username;
      const { data: newProf } = await supabase
        .from('profiles')
        .insert({ id: userId, username, display_name: displayName })
        .select()
        .single();
      profile = newProf;
    }

    // Check local cryptographic keys in IndexedDB
    let localKeys = await getIdentityKeyRecord(userId);
    if (!localKeys) {
      // New device or browser data was cleared: generate fresh device key pair
      const newKeyPair = await generateIdentityKeyPair();
      const pubSpki = await exportPublicKeySpki(newKeyPair.publicKey);

      localKeys = {
        userId,
        keyVersion: 1,
        privateKey: newKeyPair.privateKey,
        publicKey: newKeyPair.publicKey,
        publicKeyBase64: pubSpki,
        createdAt: new Date().toISOString(),
      };

      await storeIdentityKeyRecord(localKeys);

      // Update / publish public key to Supabase
      await supabase.from('public_keys').upsert(
        {
          user_id: userId,
          public_key: pubSpki,
          key_version: 1,
        },
        { onConflict: 'user_id,key_version' }
      );
    } else {
      // Ensure Supabase is synchronized with local identity key
      try {
        await supabase.from('public_keys').upsert(
          {
            user_id: userId,
            public_key: localKeys.publicKeyBase64,
            key_version: 1,
          },
          { onConflict: 'user_id,key_version' }
        );
      } catch (err) {
        console.warn('Public key sync warning:', err);
      }
    }

    // Register active device session
    await this.registerCurrentDevice(userId);

    return { user: data.user, profile };
  },

  /**
   * Registers current device session in the database.
   */
  async registerCurrentDevice(userId: string): Promise<void> {
    try {
      const userAgent = navigator.userAgent;
      let deviceName = 'Web Browser';
      if (/Windows/i.test(userAgent)) deviceName = 'Windows PC';
      else if (/Macintosh|Mac OS/i.test(userAgent)) deviceName = 'Mac';
      else if (/iPhone|iPad/i.test(userAgent)) deviceName = 'iOS Device';
      else if (/Android/i.test(userAgent)) deviceName = 'Android Device';
      else if (/Linux/i.test(userAgent)) deviceName = 'Linux PC';

      const { error } = await supabase.from('devices').insert({
        user_id: userId,
        device_name: deviceName,
        device_type: /Mobile|Android|iPhone/i.test(userAgent) ? 'mobile' : 'desktop',
        last_active: new Date().toISOString(),
      });
      if (error) {
        console.warn('Device registration notice:', error.message);
      }
    } catch {
      // Device registration non-fatal
    }
  },

  /**
   * Signs out current user.
   */
  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  /**
   * Requests password reset email.
   */
  async forgotPassword(email: string): Promise<void> {
    const val = validateEmail(email);
    if (!val.valid) throw new Error(val.error);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      throw Object.assign(new Error(sanitizeErrorMessage(error)), {
        status: error.status,
        code: error.code,
      });
    }
  },

  /**
   * Sets new password for logged-in or token-authenticated user.
   */
  async resetPassword(newPassword: string): Promise<void> {
    const val = validatePassword(newPassword);
    if (!val.valid) throw new Error(val.error);

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw Object.assign(new Error(sanitizeErrorMessage(error)), {
        status: error.status,
        code: error.code,
      });
    }
  },

  /**
   * Permanently deletes user account and wipes local cryptographic keys.
   */
  async deleteAccount(userId: string): Promise<void> {
    // 1. Call database deletion RPC
    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
      console.warn('RPC delete_user_account failed, attempting direct cleanup:', error.message);
      await supabase.from('profiles').delete().eq('id', userId);
    }

    // 2. Clear local browser IndexedDB keystore
    await clearUserKeystore(userId);

    // 3. Sign out
    await supabase.auth.signOut();
  },

  /**
   * Gets current active session user and profile.
   */
  async getCurrentUser(): Promise<{ user: any; profile: Profile | null }> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return { user: null, profile: null };

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    return { user: session.user, profile };
  },
};
