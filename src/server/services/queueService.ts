import { redis } from '@devvit/web/server';
import type { Bottle } from '../../shared/types';
import { DEMO_MODE } from '../../shared/constants';

/**
 * Push a bottle ID into the daily queue.
 * Uses a sorted set with timestamp as score for FIFO ordering.
 */
export async function pushBottle(bottleId: string, date: string): Promise<void> {
  const key = `queue:${date}`;
  await redis.zAdd(key, { member: bottleId, score: Date.now() });
}

/**
 * Pop an eligible bottle from the queue for a given user.
 * Skips bottles created by the user or where user is in recentTravelers.
 * Enforces one-catch-per-day unless DEMO_MODE is on.
 */
export async function popBottle(
  date: string,
  userId: string
): Promise<Bottle | null> {
  // Check if user already caught today (unless demo mode)
  if (!DEMO_MODE) {
    const alreadyCaught = await redis.get(`caught:${date}:${userId}`);
    if (alreadyCaught) {
      return null;
    }
  }

  const queueKey = `queue:${date}`;

  // Get all bottles in the queue, ordered by score (oldest first)
  const members = await redis.zRange(queueKey, 0, -1);
  if (!members || members.length === 0) {
    return null;
  }

  // Try each bottle in order
  for (const entry of members) {
    const bottleId = entry.member;

    const bottleData = await redis.get(`bottle:${bottleId}`);
    if (!bottleData) {
      // Stale entry — remove it
      await redis.zRem(queueKey, [bottleId]);
      continue;
    }

    const bottle = JSON.parse(bottleData) as Bottle;

    // Skip if user created this bottle
    if (bottle.creatorId === userId) {
      continue;
    }

    // Skip if user is in recent travelers
    if (bottle.recentTravelers.includes(userId)) {
      continue;
    }

    // Found an eligible bottle — remove it from queue
    await redis.zRem(queueKey, [bottleId]);

    // Mark caught
    await redis.set(`caught:${date}:${userId}`, bottleId);

    return bottle;
  }

  // No eligible bottle found
  return null;
}

/**
 * Peek at the next eligible bottle without removing it from the queue.
 * Used to show a bottle in the ocean before the user commits to catching it.
 */
export async function peekBottle(
  date: string,
  userId: string
): Promise<Bottle | null> {
  // Check if user already caught today (unless demo mode)
  if (!DEMO_MODE) {
    const alreadyCaught = await redis.get(`caught:${date}:${userId}`);
    if (alreadyCaught) {
      return null;
    }
  }

  const queueKey = `queue:${date}`;

  const members = await redis.zRange(queueKey, 0, -1);
  if (!members || members.length === 0) {
    return null;
  }

  for (const entry of members) {
    const bottleId = entry.member;

    const bottleData = await redis.get(`bottle:${bottleId}`);
    if (!bottleData) {
      await redis.zRem(queueKey, [bottleId]);
      continue;
    }

    const bottle = JSON.parse(bottleData) as Bottle;

    if (bottle.creatorId === userId) continue;
    if (bottle.recentTravelers.includes(userId)) continue;

    // Found eligible bottle — return it WITHOUT removing from queue
    return bottle;
  }

  return null;
}
