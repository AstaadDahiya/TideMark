import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import { getPlayer, savePlayer, updateStreak, getAvailableStamps, hasStreakBonus } from '../services/playerService';
import { getDayData } from '../services/tideService';

export const player = new Hono();

async function resolveUserId(): Promise<string | null> {
  if (context.userId) return context.userId;
  try {
    const username = await reddit.getCurrentUsername();
    return username || null;
  } catch {
    return null;
  }
}

// GET /api/player/me — get current player data
player.get('/me', async (c) => {
  const userId = await resolveUserId();
  if (!userId) return c.json({ error: 'Not authenticated' }, 401);

  try {
    const playerData = await getPlayer(userId);
    const today = new Date().toISOString().slice(0, 10);
    const dayData = await getDayData(today);
    const availableStamps = getAvailableStamps(playerData);
    const streakBonus = hasStreakBonus(playerData);

    return c.json({
      ...playerData,
      availableStamps,
      streakBonus,
      tideType: dayData.tideType,
    });
  } catch (e) {
    console.error('player/me: Server error', e);
    return c.json({ error: 'Server error' }, 500);
  }
});
