/**
 * Public Supabase credentials only.
 * Database writes from the enrich API send the signed-in user's JWT so
 * Postgres row-level security applies. A service-role or secret key must
 * never be read from a NEXT_PUBLIC variable or shipped to the browser.
 */

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  return url;
}

export function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
  }
  assertPublishableSupabaseKey(key);
  return key;
}

export function assertPublishableSupabaseKey(key: string): void {
  if (key.startsWith('sb_secret_')) {
    throw new Error(
      'A Supabase secret key is set as the public API key. Use the anon or publishable key.'
    );
  }

  const role = jwtPayloadRole(key);
  if (role === 'service_role') {
    throw new Error(
      'A Supabase service_role key is set as the public API key. Use the anon or publishable key.'
    );
  }
}

function jwtPayloadRole(key: string): string | null {
  const parts = key.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { role?: unknown };
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}
