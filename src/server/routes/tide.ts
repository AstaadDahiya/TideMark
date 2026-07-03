import { Hono } from 'hono';
import { getDayData } from '../services/tideService';

export const tide = new Hono();

// GET /api/tide — get today's tide data
tide.get('/', async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const dayData = await getDayData(today);
  return c.json(dayData);
});
