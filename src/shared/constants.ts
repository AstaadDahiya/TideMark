import type { StampData, BottleTint } from './types';

// All 8 base stamps + trident (9th, streak unlock)
export const STAMPS: StampData[] = [
  {
    id: 'compass',
    phraseA: 'May this find someone who needs direction.',
    phraseB: 'The compass always knows the way home.',
  },
  {
    id: 'starfish',
    phraseA: 'Wishing upon the stars beneath the waves.',
    phraseB: 'Every arm reaches toward a different horizon.',
  },
  {
    id: 'anchor',
    phraseA: 'Hold fast — the storm will pass.',
    phraseB: 'Anchored in hope, adrift in wonder.',
  },
  {
    id: 'coral',
    phraseA: 'Beauty grows slowly in the deep.',
    phraseB: 'A reef of memories, built one day at a time.',
  },
  {
    id: 'whale',
    phraseA: 'The ocean sings if you listen long enough.',
    phraseB: 'A gentle giant passed this way.',
  },
  {
    id: 'shell',
    phraseA: 'Press this to your ear and hear the sea.',
    phraseB: 'Carried by tides, shaped by time.',
  },
  {
    id: 'moon',
    phraseA: 'The moon pulls the tide — and the tide pulls us.',
    phraseB: 'Even in darkness, the moon lights the water.',
  },
  {
    id: 'wave',
    phraseA: 'Ride the wave, wherever it leads.',
    phraseB: 'Every wave was once a whisper on the wind.',
  },
  {
    id: 'trident',
    phraseA: 'The sea bows to those who return each day.',
    phraseB: 'Three days strong — the trident is yours.',
  },
];

// Stamp lookup by ID
export const STAMP_MAP = new Map(STAMPS.map((s) => [s.id, s]));

// Base stamp IDs (available to everyone)
export const BASE_STAMP_IDS = [
  'compass',
  'starfish',
  'anchor',
  'coral',
  'whale',
  'shell',
  'moon',
  'wave',
] as const;

// All available bottle tints
export const BOTTLE_TINTS: BottleTint[] = [
  'seafoam',
  'amber',
  'cobalt',
  'rose',
  'obsidian',
  'pearl',
];

// Lighthouse stage thresholds
export const LIGHTHOUSE_THRESHOLDS = {
  REPAIRED: 50,
  FESTIVAL: 200,
} as const;

// Demo mode — set to true to bypass one-catch-per-day and enable admin endpoints
export const DEMO_MODE = true;

// Max recent travelers tracked on a bottle (anti-loop)
export const MAX_RECENT_TRAVELERS = 5;

// Streak threshold for trident unlock
export const STREAK_THRESHOLD = 3;
