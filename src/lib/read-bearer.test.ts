import assert from 'node:assert/strict';
import test from 'node:test';
import { readBearerToken } from './read-bearer.ts';

test('reads a bearer token', () => {
  assert.equal(readBearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
  assert.equal(readBearerToken('bearer token'), 'token');
});

test('rejects missing or malformed authorization headers', () => {
  assert.equal(readBearerToken(null), null);
  assert.equal(readBearerToken('Basic abc'), null);
  assert.equal(readBearerToken('Bearer '), null);
  assert.equal(readBearerToken('Bearer one two'), null);
});
