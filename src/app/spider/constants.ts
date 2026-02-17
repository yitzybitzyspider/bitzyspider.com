/** Spider game config – tune in one place. */

export const SPIDER = {
  BODY_SIZE: 20,
  HEAD_SIZE: 12,
  LEG_COUNT: 8,
  STEP_THRESHOLD: 60,
  STEP_SPEED: 0.25,
  WEB_LIFETIME: 5000,
  AUTO_HUNT_DELAY: 2500,
} as const;

export const FLY = {
  SPEED: 8,
  JITTER: 0.5,
  SIZE: 6,
  CATCH_RADIUS: 30,
  RESPAWN_MS: 200,
} as const;

export const LEG_ORIGINS = [
  { x: 15, y: -10 }, { x: 10, y: -15 }, { x: 5, y: -18 }, { x: 0, y: -15 },
  { x: 15, y: 10 }, { x: 10, y: 15 }, { x: 5, y: 18 }, { x: 0, y: 15 },
] as const;

export const LEG_TARGETS = [
  { x: 60, y: -30 }, { x: 55, y: -50 }, { x: 35, y: -60 }, { x: -10, y: -65 },
  { x: 60, y: 30 }, { x: 55, y: 50 }, { x: 35, y: 60 }, { x: -10, y: 65 },
] as const;
