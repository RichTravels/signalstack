import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPublishableSupabaseKey } from './env.ts';

function jwt(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `eyJhbGciOiJub25lIn0.${body}.sig`;
}

test('accepts the anon key role and non-jwt publishable keys', () => {
  assert.doesNotThrow(() => assertPublishableSupabaseKey(jwt({ role: 'anon' })));
  assert.doesNotThrow(() => assertPublishableSupabaseKey('sb_publishable_example'));
  assert.doesNotThrow(() => assertPublishableSupabaseKey('ci-placeholder-anon-key'));
});

test('rejects a service role or secret key in the public key slot', () => {
  assert.throws(() => assertPublishableSupabaseKey(jwt({ role: 'service_role' })));
  assert.throws(() => assertPublishableSupabaseKey('sb_secret_example'));
});
