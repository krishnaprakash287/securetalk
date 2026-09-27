import { describe, it, expect } from 'vitest';
import { normalizeUsername, validateUsername, validatePassword, validateEmail } from '../utils/validation';
import { sanitizeErrorMessage } from '../utils/errors';

describe('Validation & Error Sanitization', () => {
  describe('Username Validation', () => {
    it('normalizes usernames by removing leading @ and lowercase', () => {
      expect(normalizeUsername('@Alice_24')).toBe('alice_24');
      expect(normalizeUsername('  BOB_SECURE  ')).toBe('bob_secure');
    });

    it('accepts valid usernames', () => {
      expect(validateUsername('alice24').valid).toBe(true);
      expect(validateUsername('krishna_123').valid).toBe(true);
      expect(validateUsername('sec_user_99').valid).toBe(true);
    });

    it('rejects usernames under 3 characters', () => {
      const res = validateUsername('al');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/at least 3 characters/);
    });

    it('rejects usernames over 30 characters', () => {
      const res = validateUsername('a'.repeat(31));
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/cannot exceed 30 characters/);
    });

    it('rejects usernames with spaces or special symbols', () => {
      expect(validateUsername('alice smith').valid).toBe(false);
      expect(validateUsername('alice$123').valid).toBe(false);
      expect(validateUsername('alice@domain').valid).toBe(false);
    });

    it('rejects reserved system and admin usernames', () => {
      expect(validateUsername('admin').valid).toBe(false);
      expect(validateUsername('securetalk').valid).toBe(false);
      expect(validateUsername('system').valid).toBe(false);
      expect(validateUsername('moderator').valid).toBe(false);
    });
  });

  describe('Password & Email Validation', () => {
    it('validates passwords properly', () => {
      expect(validatePassword('short').valid).toBe(false);
      expect(validatePassword('alllettersnodigits').valid).toBe(false);
      expect(validatePassword('123456789').valid).toBe(false);
      expect(validatePassword('StrongPass123!').valid).toBe(true);
    });

    it('validates emails properly', () => {
      expect(validateEmail('invalid-email').valid).toBe(false);
      expect(validateEmail('alice@example.com').valid).toBe(true);
    });
  });

  describe('Error Sanitization', () => {
    it('strips postgres connection strings, database secrets, and jwt tokens', () => {
      const dbError = new Error('Connection failed to postgresql://postgres:mypassword@db.supabase.co:5432/postgres');
      const sanitized = sanitizeErrorMessage(dbError);
      expect(sanitized).not.toContain('postgresql');
      expect(sanitized).not.toContain('mypassword');

      const jwtError = new Error('Token error eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeak');
      expect(sanitizeErrorMessage(jwtError)).toBe('An unexpected error occurred. Please try again.');
    });

    it('translates common errors to user-friendly messages', () => {
      expect(sanitizeErrorMessage('Invalid login credentials')).toBe('Invalid email or password. Please try again.');
      expect(sanitizeErrorMessage('Decryption failed')).toBe('Unable to decrypt this message. Cryptographic verification failed.');
    });

    it('translates 429 and rate limit errors cleanly', () => {
      const rateLimitObj = { status: 429, message: 'Too Many Requests' };
      expect(sanitizeErrorMessage(rateLimitObj)).toContain('Rate limit reached');

      const supabaseAuthLimit = {
        code: 'over_email_send_rate_limit',
        message: 'For security purposes, you can only request this once every 60 seconds',
      };
      expect(sanitizeErrorMessage(supabaseAuthLimit)).toContain('once every 60 seconds');
    });

    it('translates database policy recursion to fix_rls.sql instruction', () => {
      const recursionErr = new Error('infinite recursion detected in policy for relation "conversation_members"');
      expect(sanitizeErrorMessage(recursionErr)).toContain('fix_rls.sql');
    });

    it('translates row-level security policy violations to fix_rls.sql instruction', () => {
      const rlsErr = new Error('new row violates row-level security policy for table "chat_requests"');
      expect(sanitizeErrorMessage(rlsErr)).toContain('fix_rls.sql');
    });
  });
});
