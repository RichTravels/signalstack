import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { readBearerToken } from '@/lib/read-bearer';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/env';
import { createClient as createCookieClient } from '@/lib/supabase/server';

/**
 * PostgREST client that sends a verified user access token.
 * The apikey stays the public anon/publishable key. The Authorization
 * bearer is the user's JWT, so row-level security sees auth.uid().
 */
export function createUserScopedClient(accessToken: string): SupabaseClient {
  return createSupabaseClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function requireSignedInClient(
  request: Request
): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const authorization = request.headers.get('authorization');
  if (authorization) {
    const bearer = readBearerToken(authorization);
    if (!bearer) return null;
    return clientFromAccessToken(bearer);
  }

  return clientFromCookies();
}

async function clientFromAccessToken(
  accessToken: string
): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const supabase = createUserScopedClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    console.error('Enrich auth rejected:', error?.message ?? 'no user');
    return null;
  }
  return { supabase, userId: data.user.id };
}

async function clientFromCookies(): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const cookieClient = await createCookieClient();
  const { data: userData, error: userError } = await cookieClient.auth.getUser();
  if (userError || !userData.user) {
    return null;
  }

  // The user id above came from the Auth server. Read the access token only
  // so later writes, including background work, send that same JWT.
  const { data, error } = await cookieClient.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken) {
    return null;
  }

  return {
    supabase: createUserScopedClient(accessToken),
    userId: userData.user.id,
  };
}
