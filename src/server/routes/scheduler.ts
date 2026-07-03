import { Hono } from 'hono';
import { getDayData } from '../services/tideService';
import type { TaskResponse } from '@devvit/web/shared';

export const scheduler = new Hono();

// POST /internal/scheduler/daily-seed — called by cron at midnight UTC
scheduler.post('/daily-seed', async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const dayData = await getDayData(today);

  console.log(`[Scheduler] Daily seed generated for ${today}: tide=${dayData.tideType}, seed=${dayData.seed}`);

  return c.json<TaskResponse>({ status: 'ok' }, 200);
});
