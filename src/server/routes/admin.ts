import { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import { DEMO_MODE, BOTTLE_TINTS, BASE_STAMP_IDS } from '../../shared/constants';
import { setLight } from '../services/lighthouseService';
import { pushBottle } from '../services/queueService';
import { getDayData } from '../services/tideService';
import type { Bottle, Stop, StampId, BottleTint } from '../../shared/types';

export const admin = new Hono();

function generateId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// POST /api/admin/seed — seed demo bottles
admin.post('/seed', async (c) => {
  if (!DEMO_MODE) return c.json({ error: 'Demo mode disabled' }, 403);

  const today = new Date().toISOString().slice(0, 10);
  const dayData = await getDayData(today);
  const seededBottles: string[] = [];

  // Create 8 bottles with varied histories
  const configs = [
    { hops: 2, tint: 'seafoam' as BottleTint, rare: false },
    { hops: 5, tint: 'amber' as BottleTint, rare: false },
    { hops: 8, tint: 'cobalt' as BottleTint, rare: true },
    { hops: 1, tint: 'rose' as BottleTint, rare: false },
    { hops: 12, tint: 'obsidian' as BottleTint, rare: true },
    { hops: 3, tint: 'pearl' as BottleTint, rare: false },
    { hops: 6, tint: 'seafoam' as BottleTint, rare: false },
    { hops: 15, tint: 'amber' as BottleTint, rare: true },
  ];

  const tides = ['calm', 'storm', 'whirlpool', 'aurora'] as const;

  for (const cfg of configs) {
    const bottleId = generateId();
    const stops: Stop[] = [];

    for (let i = 0; i <= cfg.hops; i++) {
      stops.push({
        stampId: BASE_STAMP_IDS[i % BASE_STAMP_IDS.length] as StampId,
        phraseId: Math.random() > 0.5 ? 'A' : 'B',
        tide: tides[i % tides.length],
        ts: Date.now() - (cfg.hops - i) * 86400000,
        travelerId: `demo_user_${i}`,
      });
    }

    const bottle: Bottle = {
      id: bottleId,
      creatorId: 'demo_creator',
      tint: cfg.tint,
      stops,
      hopCount: cfg.hops,
      isRare: cfg.rare,
      status: 'drifting',
      recentTravelers: stops.slice(-5).map((s) => s.travelerId),
    };

    await redis.set(`bottle:${bottleId}`, JSON.stringify(bottle));
    await pushBottle(bottleId, today);
    seededBottles.push(bottleId);
  }

  return c.json({ seeded: seededBottles.length, bottles: seededBottles });
});

// POST /api/admin/lighthouse — set lighthouse level
admin.post('/lighthouse', async (c) => {
  if (!DEMO_MODE) return c.json({ error: 'Demo mode disabled' }, 403);

  const { level } = await c.req.json<{ level: number }>();
  // level 1 = 50 light, level 2 = 200 light
  const lightAmount = level === 2 ? 200 : level === 1 ? 50 : 0;
  await setLight(lightAmount);

  return c.json({ success: true, totalLight: lightAmount });
});

// POST /api/admin/reset — clear all data
admin.post('/reset', async (c) => {
  if (!DEMO_MODE) return c.json({ error: 'Demo mode disabled' }, 403);

  // Note: Devvit Redis doesn't support KEYS/SCAN,
  // so we can only clear known keys. In practice, this resets the lighthouse.
  await setLight(0);

  return c.json({ success: true, message: 'Lighthouse reset' });
});
