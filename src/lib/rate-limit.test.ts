import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ENRICH_LIMIT,
  ENRICH_WINDOW_MS,
  checkAndRecordLocalLimit,
  resetLocalRateLimits,
} from './rate-limit.ts';

test('allows up to the per-user limit inside the window', () => {
  resetLocalRateLimits();
  const now = 1_000_000;
  for (let i = 0; i < ENRICH_LIMIT; i += 1) {
    const result = checkAndRecordLocalLimit('user-a', now + i);
    assert.equal(result.allowed, true);
  }
  const blocked = checkAndRecordLocalLimit('user-a', now + ENRICH_LIMIT);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
  assert.ok(blocked.retryAfterSeconds <= ENRICH_WINDOW_MS / 1000);
});

test('limits are tracked separately per user', () => {
  resetLocalRateLimits();
  const now = 2_000_000;
  for (let i = 0; i < ENRICH_LIMIT; i += 1) {
    checkAndRecordLocalLimit('user-a', now);
  }
  assert.equal(checkAndRecordLocalLimit('user-b', now).allowed, true);
  assert.equal(checkAndRecordLocalLimit('user-a', now).allowed, false);
});

test('old hits fall out of the window', () => {
  resetLocalRateLimits();
  const start = 3_000_000;
  for (let i = 0; i < ENRICH_LIMIT; i += 1) {
    checkAndRecordLocalLimit('user-a', start);
  }
  const later = start + ENRICH_WINDOW_MS + 1;
  assert.equal(checkAndRecordLocalLimit('user-a', later).allowed, true);
});
