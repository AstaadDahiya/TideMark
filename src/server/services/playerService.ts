import { redis } from '@devvit/web/server';
import type { Player, StampId } from '../../shared/types';
import { BASE_STAMP_IDS, STREAK_THRESHOLD } from '../../shared/constants';

const PLAYER_PREFIX = 'player:';

function defaultPlayer(): Player {
  return {
    bottlesCreated: 0,
    bottlesKept: 0,
    bottlesRelaunched: 0,
    collection: [],
    streak: 0,
    lastActiveDate: '',
  };
}

/**
 * Get a player, creating default data if they don't exist yet.
 */
export async function getPlayer(userId: string): Promise<Player> {
  const raw = await redis.get(`${PLAYER_PREFIX}${userId}`);
  if (raw) {
    return JSON.parse(raw) as Player;
  }
  return defaultPlayer();
}

/**
 * Save player data.
 */
export async function savePlayer(userId: string, player: Player): Promise<void> {
  await redis.set(`${PLAYER_PREFIX}${userId}`, JSON.stringify(player));
}

/**
 * Update a player's streak based on today's date.
 * Call this when a player performs a daily action.
 */
export function updateStreak(player: Player, today: string): Player {
  if (player.lastActiveDate === today) {
    // Already active today, no change
    return player;
  }

  // Check if yesterday
  const todayDate = new Date(today + 'T00:00:00Z');
  const yesterday = new Date(todayDate.getTime() - 86400000);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (player.lastActiveDate === yesterdayStr) {
    // Consecutive day — increment streak
    return {
      ...player,
      streak: player.streak + 1,
      lastActiveDate: today,
    };
  }

  // Streak broken — reset to 1
  return {
    ...player,
    streak: 1,
    lastActiveDate: today,
  };
}

/**
 * Check if a player has the streak bonus (unlocks trident stamp).
 */
export function hasStreakBonus(player: Player): boolean {
  return player.streak >= STREAK_THRESHOLD;
}

/**
 * Get available stamp IDs for a player.
 */
export function getAvailableStamps(player: Player): StampId[] {
  const stamps: StampId[] = [...BASE_STAMP_IDS];
  if (hasStreakBonus(player)) {
    stamps.push('trident');
  }
  return stamps;
}
