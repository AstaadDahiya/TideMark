import { redis } from '@devvit/web/server';
import type { Lighthouse, LighthouseStage } from '../../shared/types';
import { LIGHTHOUSE_THRESHOLDS } from '../../shared/constants';

const LIGHTHOUSE_KEY = 'lighthouse:global';

/**
 * Derive lighthouse stage from totalLight.
 * Stage is ALWAYS derived, never stored directly.
 */
export function deriveStage(totalLight: number): LighthouseStage {
  if (totalLight >= LIGHTHOUSE_THRESHOLDS.FESTIVAL) return 'Festival';
  if (totalLight >= LIGHTHOUSE_THRESHOLDS.REPAIRED) return 'Repaired';
  return 'Broken';
}

/**
 * Get the lighthouse state with derived stage.
 */
export async function getLighthouse(): Promise<
  Lighthouse & { stage: LighthouseStage }
> {
  const raw = await redis.get(LIGHTHOUSE_KEY);
  const totalLight = raw ? parseInt(raw, 10) : 0;
  return {
    totalLight,
    stage: deriveStage(totalLight),
  };
}

/**
 * Add light to the global lighthouse.
 */
export async function addLight(amount: number): Promise<number> {
  const newTotal = await redis.incrBy(LIGHTHOUSE_KEY, amount);
  return newTotal;
}

/**
 * Set lighthouse totalLight directly (admin/demo only).
 */
export async function setLight(amount: number): Promise<void> {
  await redis.set(LIGHTHOUSE_KEY, String(amount));
}
