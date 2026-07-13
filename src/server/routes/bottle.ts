import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type { Bottle, Stop, BottleTint, StampId } from '../../shared/types';
import { STAMP_MAP, MAX_RECENT_TRAVELERS } from '../../shared/constants';
import { pushBottle, popBottle, peekBottle } from '../services/queueService';
import { getDayData } from '../services/tideService';
import { getVoyageScore, getVoyageTier, getLossChance } from '../services/scoreService';
import { addLight } from '../services/lighthouseService';
import { getPlayer, savePlayer, updateStreak, getAvailableStamps } from '../services/playerService';

export const bottle = new Hono();

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Resolve user ID — tries context.userId first, then reddit.getCurrentUsername() */
async function resolveUserId(): Promise<string | null> {
  if (context.userId) return context.userId;
  try {
    const username = await reddit.getCurrentUsername();
    return username || null;
  } catch {
    return null;
  }
}

// POST /api/bottle/create — create a new bottle
bottle.post('/create', async (c) => {
  const userId = await resolveUserId();
  if (!userId) {
    console.error('bottle/create: No user ID available');
    return c.json({ error: 'Not authenticated' }, 401);
  }

  let body: { tint: BottleTint; stampId: StampId; phraseId: 'A' | 'B' };
  try {
    body = await c.req.json();
  } catch (e) {
    console.error('bottle/create: Failed to parse body', e);
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // Validate stamp
  const stamp = STAMP_MAP.get(body.stampId);
  if (!stamp) {
    console.error('bottle/create: Invalid stamp', body.stampId);
    return c.json({ error: 'Invalid stamp' }, 400);
  }

  try {
    const today = getToday();
    const dayData = await getDayData(today);
    const bottleId = generateId();

    const originStop: Stop = {
      stampId: body.stampId,
      phraseId: body.phraseId,
      tide: dayData.tideType,
      ts: Date.now(),
      travelerId: userId,
    };

    const newBottle: Bottle = {
      id: bottleId,
      creatorId: userId,
      tint: body.tint,
      stops: [originStop],
      hopCount: 0,
      isRare: false,
      status: 'drifting',
      recentTravelers: [userId],
    };

    // Save bottle and push to queue
    await redis.set(`bottle:${bottleId}`, JSON.stringify(newBottle));
    await pushBottle(bottleId, today);

    // Update player stats
    const player = await getPlayer(userId);
    player.bottlesCreated += 1;
    const updated = updateStreak(player, today);
    await savePlayer(userId, updated);

    console.log(`bottle/create: Created ${bottleId} by ${userId}`);
    return c.json({ bottle: newBottle });
  } catch (e) {
    console.error('bottle/create: Server error', e);
    return c.json({ error: 'Server error creating bottle' }, 500);
  }
});

// POST /api/bottle/peek — preview a bottle without removing from queue
bottle.post('/peek', async (c) => {
  const userId = await resolveUserId();
  if (!userId) return c.json({ error: 'Not authenticated' }, 401);

  try {
    const today = getToday();
    const peekedBottle = await peekBottle(today, userId);

    if (!peekedBottle) {
      return c.json({ bottle: null, message: 'No bottles drifting nearby' });
    }

    const score = getVoyageScore(peekedBottle);
    const tier = getVoyageTier(score);

    return c.json({ bottle: peekedBottle, score, tier });
  } catch (e) {
    console.error('bottle/peek: Server error', e);
    return c.json({ error: 'Server error' }, 500);
  }
});

// POST /api/bottle/catch — catch the next eligible bottle
bottle.post('/catch', async (c) => {
  const userId = await resolveUserId();
  if (!userId) return c.json({ error: 'Not authenticated' }, 401);

  try {
    const today = getToday();
    const caughtBottle = await popBottle(today, userId);

    if (!caughtBottle) {
      return c.json({ bottle: null, message: 'No bottles drifting nearby' });
    }

    // Compute display data
    const score = getVoyageScore(caughtBottle);
    const tier = getVoyageTier(score);
    const dayData = await getDayData(today);
    const lossChance = getLossChance(caughtBottle, dayData.tideType);

    return c.json({
      bottle: caughtBottle,
      score,
      tier,
      lossChance: { wording: lossChance.wording },
      tideType: dayData.tideType,
    });
  } catch (e) {
    console.error('bottle/catch: Server error', e);
    return c.json({ error: 'Server error' }, 500);
  }
});

// POST /api/bottle/keep — keep a bottle in your collection
bottle.post('/keep', async (c) => {
  const userId = await resolveUserId();
  if (!userId) return c.json({ error: 'Not authenticated' }, 401);

  const { bottleId } = await c.req.json<{ bottleId: string }>();

  const raw = await redis.get(`bottle:${bottleId}`);
  if (!raw) return c.json({ error: 'Bottle not found' }, 404);

  const btl = JSON.parse(raw) as Bottle;
  if (btl.status !== 'drifting') return c.json({ error: 'Bottle is not drifting' }, 400);

  // Mark as kept
  btl.status = 'kept';
  await redis.set(`bottle:${bottleId}`, JSON.stringify(btl));

  // Add to player collection
  const player = await getPlayer(userId);
  player.bottlesKept += 1;
  player.collection.push(bottleId);
  const today = getToday();
  const updated = updateStreak(player, today);
  await savePlayer(userId, updated);

  // Add light to lighthouse
  await addLight(1);

  // Generate postcard data (structured, rendered client-side)
  const score = getVoyageScore(btl);
  const tier = getVoyageTier(score);
  const postcard = {
    bottleId: btl.id,
    tint: btl.tint,
    hopCount: btl.hopCount,
    tier,
    totalStops: btl.stops.length,
    finalStamp: btl.stops[btl.stops.length - 1]?.stampId,
    keptBy: userId,
    keptAt: Date.now(),
  };
  await redis.set(`postcard:${bottleId}`, JSON.stringify(postcard));

  // Push postcard to the original creator's player data so they can see it
  if (btl.creatorId && btl.creatorId !== userId) {
    try {
      const creator = await getPlayer(btl.creatorId);
      if (!creator.postcards) creator.postcards = [];
      creator.postcards.push(postcard);
      await savePlayer(btl.creatorId, creator);
    } catch (e) {
      console.error('bottle/keep: Failed to send postcard to creator', e);
    }
  }

  return c.json({
    success: true,
    postcard,
    message: 'This bottle has found its home.',
  });
});

// POST /api/bottle/relaunch — add a stamp and relaunch
bottle.post('/relaunch', async (c) => {
  const userId = await resolveUserId();
  if (!userId) return c.json({ error: 'Not authenticated' }, 401);

  const { bottleId, stampId, phraseId } = await c.req.json<{
    bottleId: string;
    stampId: StampId;
    phraseId: 'A' | 'B';
  }>();

  // Validate stamp
  const stamp = STAMP_MAP.get(stampId);
  if (!stamp) return c.json({ error: 'Invalid stamp' }, 400);

  const raw = await redis.get(`bottle:${bottleId}`);
  if (!raw) return c.json({ error: 'Bottle not found' }, 404);

  const btl = JSON.parse(raw) as Bottle;
  if (btl.status !== 'drifting') return c.json({ error: 'Bottle is not drifting' }, 400);

  const today = getToday();
  const dayData = await getDayData(today);

  // Roll for loss
  const lossInfo = getLossChance(btl, dayData.tideType);
  const roll = Math.random() * 100;
  const isLost = roll < lossInfo.percentage;

  if (isLost) {
    // Bottle lost to the depths
    btl.status = 'lost';
    await redis.set(`bottle:${bottleId}`, JSON.stringify(btl));

    // Update player stats
    const player = await getPlayer(userId);
    player.bottlesRelaunched += 1;
    const updated = updateStreak(player, today);
    await savePlayer(userId, updated);

    return c.json({
      success: false,
      lost: true,
      message: 'The bottle was claimed by the depths...',
    });
  }

  // Success — add stop and requeue
  const newStop: Stop = {
    stampId,
    phraseId,
    tide: dayData.tideType,
    ts: Date.now(),
    travelerId: userId,
  };

  btl.stops.push(newStop);
  btl.hopCount += 1;

  // Whirlpool rare chance
  if (dayData.tideType === 'whirlpool' && Math.random() < 0.15) {
    btl.isRare = true;
  }

  // Update recent travelers (keep last 5)
  btl.recentTravelers.push(userId);
  if (btl.recentTravelers.length > MAX_RECENT_TRAVELERS) {
    btl.recentTravelers = btl.recentTravelers.slice(-MAX_RECENT_TRAVELERS);
  }

  await redis.set(`bottle:${bottleId}`, JSON.stringify(btl));

  // Push to tomorrow's queue
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await pushBottle(bottleId, tomorrow);

  // Add light to lighthouse
  await addLight(1);

  // Update player stats
  const player = await getPlayer(userId);
  player.bottlesRelaunched += 1;
  const updated = updateStreak(player, today);
  await savePlayer(userId, updated);

  const score = getVoyageScore(btl);
  const tier = getVoyageTier(score);

  return c.json({
    success: true,
    lost: false,
    bottle: btl,
    score,
    tier,
    message: 'The bottle sails on...',
  });
});

// GET /api/bottle/:id — get a bottle's data
bottle.get('/:id', async (c) => {
  const bottleId = c.req.param('id');
  const raw = await redis.get(`bottle:${bottleId}`);
  if (!raw) return c.json({ error: 'Bottle not found' }, 404);

  const btl = JSON.parse(raw) as Bottle;
  const score = getVoyageScore(btl);
  const tier = getVoyageTier(score);

  return c.json({ bottle: btl, score, tier });
});
