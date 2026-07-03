import { Hono } from 'hono';
import { getLighthouse } from '../services/lighthouseService';

export const lighthouse = new Hono();

// GET /api/lighthouse — get global lighthouse state
lighthouse.get('/', async (c) => {
  const data = await getLighthouse();
  const stageIndex = data.stage === 'Festival' ? 2 : data.stage === 'Repaired' ? 1 : 0;

  return c.json({
    totalLight: data.totalLight,
    stage: stageIndex,
    stageName: data.stage,
  });
});
