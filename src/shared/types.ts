// Bottle tints
export type BottleTint = 'seafoam' | 'amber' | 'cobalt' | 'rose' | 'obsidian' | 'pearl';

// Stamp IDs
export type StampId =
  | 'compass'
  | 'starfish'
  | 'anchor'
  | 'coral'
  | 'whale'
  | 'shell'
  | 'moon'
  | 'wave'
  | 'trident';
// trident is the 9th stamp unlocked by 3-day streak

// Tide types
export type TideType = 'calm' | 'storm' | 'whirlpool' | 'aurora';

// A single stop in a bottle's journey
export interface Stop {
  stampId: StampId;
  phraseId: 'A' | 'B';
  tide: TideType;
  ts: number;
  travelerId: string;
}

// Bottle data
export interface Bottle {
  id: string;
  creatorId: string;
  tint: BottleTint;
  stops: Stop[];
  hopCount: number;
  isRare: boolean;
  status: 'drifting' | 'kept' | 'lost' | 'expired';
  recentTravelers: string[]; // last 5 traveler IDs
}

// Player data
export interface Player {
  bottlesCreated: number;
  bottlesKept: number;
  bottlesRelaunched: number;
  collection: string[]; // bottle IDs
  postcards?: any[];    // postcards received when someone keeps your bottle
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
}

// Lighthouse (totalLight only, stage derived on read)
export interface Lighthouse {
  totalLight: number;
}

// Lighthouse stage — derived, never stored
export type LighthouseStage = 'Broken' | 'Repaired' | 'Festival';

// Day data
export interface DayData {
  tideType: TideType;
  seed: number;
}

// Voyage tier
export type VoyageTier =
  | 'Drifting Letter'
  | 'Storied Vessel'
  | 'Legendary Wanderer'
  | 'Tidemark Legend';

// Stamp data with phrases
export interface StampData {
  id: StampId;
  phraseA: string;
  phraseB: string;
}

// Loss chance wording (diegetic, never raw percentage)
export interface LossChanceInfo {
  percentage: number;
  wording: string;
}
