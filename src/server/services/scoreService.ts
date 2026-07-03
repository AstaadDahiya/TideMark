import type { Bottle, TideType, VoyageTier, LossChanceInfo } from '../../shared/types';

/**
 * Compute a voyage score for a bottle.
 */
export function getVoyageScore(bottle: Bottle): number {
  const hopScore = bottle.hopCount * 10;
  const rareBonus = bottle.isRare ? 50 : 0;
  const stormStops = bottle.stops.filter((s) => s.tide === 'storm').length;
  const stormBonus = stormStops * 5;
  return hopScore + rareBonus + stormBonus;
}

/**
 * Get the voyage tier title for a given score.
 */
export function getVoyageTier(score: number): VoyageTier {
  if (score >= 200) return 'Tidemark Legend';
  if (score >= 100) return 'Legendary Wanderer';
  if (score >= 50) return 'Storied Vessel';
  return 'Drifting Letter';
}

/**
 * Compute the loss chance for a bottle under the current tide.
 * Returns both the percentage and diegetic wording — client should only show wording.
 * Formula: min(30, 5 + 2 * hopCount) + (storm ? 10 : 0)
 */
export function getLossChance(bottle: Bottle, tideType: TideType): LossChanceInfo {
  const base = Math.min(30, 5 + 2 * bottle.hopCount);
  const stormPenalty = tideType === 'storm' ? 10 : 0;
  const percentage = base + stormPenalty;

  let wording: string;
  if (percentage <= 10) {
    wording = 'Calm waters ahead';
  } else if (percentage <= 20) {
    wording = 'The current pulls strongly';
  } else if (percentage <= 30) {
    wording = 'Storm approaching — this voyage is dangerous';
  } else {
    wording = 'Treacherous seas — few bottles survive';
  }

  return { percentage, wording };
}
