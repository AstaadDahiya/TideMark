import { redis } from '@devvit/web/server';
import type { TideType, DayData } from '../../shared/types';

/**
 * Hash a date string to a numeric seed.
 * Uses a simple djb2-style hash.
 */
function hashDate(date: string): number {
  let hash = 5381;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 33) ^ date.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Determine tide type from a seed value.
 * calm: 0-59 (60%), storm: 60-79 (20%), whirlpool: 80-94 (15%), aurora: 95-99 (5%)
 */
function determineTide(seed: number): TideType {
  const roll = seed % 100;
  if (roll < 60) return 'calm';
  if (roll < 80) return 'storm';
  if (roll < 95) return 'whirlpool';
  return 'aurora';
}

/**
 * Get or create the day data for a given date string (YYYY-MM-DD).
 */
export async function getDayData(date: string): Promise<DayData> {
  const key = `day:${date}`;
  const existing = await redis.get(key);

  if (existing) {
    return JSON.parse(existing) as DayData;
  }

  const seed = hashDate(date);
  const tideType = determineTide(seed);
  const dayData: DayData = { tideType, seed };

  await redis.set(key, JSON.stringify(dayData));
  return dayData;
}
