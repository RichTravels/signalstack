export const ENRICH_LIMIT = 5;
export const ENRICH_WINDOW_MS = 10 * 60 * 1000;

const hitsByUser = new Map<string, number[]>();

export function resetLocalRateLimits(): void {
  hitsByUser.clear();
}

export function checkAndRecordLocalLimit(
  userId: string,
  now = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  const windowStart = now - ENRICH_WINDOW_MS;
  const recent = (hitsByUser.get(userId) ?? []).filter((hit) => hit > windowStart);

  if (recent.length >= ENRICH_LIMIT) {
    hitsByUser.set(userId, recent);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((recent[0] + ENRICH_WINDOW_MS - now) / 1000)
    );
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  hitsByUser.set(userId, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}
