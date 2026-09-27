// ==============================================================================
// SecureTalk Input Validation & Sanitization
// ==============================================================================

export const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'system',
  'securetalk',
  'support',
  'root',
  'moderator',
  'mod',
  'help',
  'security',
  'official',
  'staff',
  'api',
  'bot',
  'contact',
  'billing',
  'developer',
  'guest',
  'null',
  'undefined',
  'anonymous',
]);

/**
 * Normalizes username to lowercase and trims whitespace.
 */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, '');
}

/**
 * Validates a username according to product and security specifications.
 */
export function validateUsername(raw: string): { valid: boolean; error?: string } {
  const normalized = normalizeUsername(raw);

  if (!normalized) {
    return { valid: false, error: 'Username is required.' };
  }

  if (normalized.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long.' };
  }

  if (normalized.length > 30) {
    return { valid: false, error: 'Username cannot exceed 30 characters.' };
  }

  if (!USERNAME_REGEX.test(normalized)) {
    return {
      valid: false,
      error: 'Username can only contain lowercase letters, numbers, and underscores (no spaces or special symbols).',
    };
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      valid: false,
      error: 'This username is reserved by the system and cannot be registered.',
    };
  }

  return { valid: true };
}

/**
 * Validates password strength (minimum 8 chars, at least one letter and one number).
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter and one number.' };
  }
  return { valid: true };
}

/**
 * Validates email format.
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  return { valid: true };
}
