// ==============================================================================
// SecureTalk Safe Error Handling
// Sanitizes error messages to prevent leakage of secrets, keys, or stack traces
// ==============================================================================

const SENSITIVE_PATTERNS = [
  /sb_publishable_[a-zA-Z0-9_-]+/gi,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi, // JWT
  /postgres(ql)?:\/\/[^\s]+/gi, // Database URIs
  /(password|passwd|pwd)\s*[:=]\s*["']?[^\s"',;]+/gi, // Leaked password values
  /(client_secret|api_key|service_role|secret_key)\s*[:=]\s*["']?[^\s"',;]+/gi,
  /private_?key\s*[:=]/gi,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/gi,
];

/**
 * Sanitizes any raw error into a user-safe message, preventing secret leaks.
 */
export function sanitizeErrorMessage(error: unknown, fallback = 'An unexpected error occurred. Please try again.'): string {
  if (!error) return fallback;

  let msg = '';
  let status: number | undefined;
  let code = '';

  if (typeof error === 'string') {
    msg = error;
  } else if (error instanceof Error) {
    msg = error.message;
    status = (error as { status?: number }).status;
    code = String((error as { code?: string }).code || '');
  } else if (typeof error === 'object' && error !== null) {
    msg = 'message' in error ? String((error as Record<string, unknown>).message) : '';
    status = (error as { status?: number }).status;
    code = String((error as { code?: string }).code || '');
  } else {
    return fallback;
  }

  // Supabase rate limiting (HTTP 429 / over_email_send_rate_limit)
  if (
    status === 429 ||
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    /rate limit/i.test(msg) ||
    /429/i.test(msg) ||
    /too many requests/i.test(msg) ||
    /once every \d+ seconds/i.test(msg) ||
    /security purposes.*once every/i.test(msg)
  ) {
    return 'Rate limit reached: For security, you can only request a recovery email once every 60 seconds. Please wait before trying again.';
  }

  // Check if error contains sensitive patterns or stack traces
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(msg)) {
      return fallback;
    }
  }

  // Common Supabase / Database / Network friendly translations
  if (msg.includes('infinite recursion') || msg.includes('42P17')) {
    return 'Database policy recursion detected. Please execute the script in supabase/fix_rls.sql in your Supabase SQL Editor.';
  }
  if (msg.includes('violates row-level security policy') || msg.includes('42501')) {
    return 'Database permissions policy blocked this action. Please execute the updated script in supabase/fix_rls.sql in your Supabase SQL Editor.';
  }
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (msg.includes('User already registered') || msg.includes('unique constraint') || msg.includes('23505')) {
    return 'This username or email is already in use.';
  }
  if (
    /error sending (recovery|reset|confirmation|forget|email|mail)/i.test(msg) ||
    /error sending.*(email|mail)/i.test(msg)
  ) {
    return 'Supabase email limit exceeded ("Error sending recovery email"). Supabase free tier limits email delivery to 2-3 emails per hour. To send emails reliably, enable Custom SMTP (e.g. Gmail or Resend) in Supabase Dashboard > Project Settings > Authentication > SMTP Settings.';
  }
  if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (msg.includes('JWT expired') || msg.includes('session_not_found')) {
    return 'Your session has expired. Please log in again.';
  }
  if (msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
    return 'Network connection issue. Please check your internet connection.';
  }
  if (msg.includes('Decryption failed')) {
    return 'Unable to decrypt this message. Cryptographic verification failed.';
  }
  if (msg.includes('violates check constraint "username_format_check"')) {
    return 'Username does not meet security requirements.';
  }
  if (msg.includes('schema cache') || msg.includes('PGRST205')) {
    return 'Database tables not initialized yet. Please run the SQL script in supabase/schema.sql in your Supabase SQL Editor.';
  }

  // Truncate message to avoid showing raw SQL or traces
  if (msg.length > 140 || msg.includes('\n') || msg.includes('at ') || msg.includes('PostgresError')) {
    return fallback;
  }

  return msg;
}
