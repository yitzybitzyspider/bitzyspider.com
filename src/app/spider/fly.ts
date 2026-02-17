import { FLY } from './constants';
import type { Point } from './types';

export interface FlyState {
  pos: Point;
  vel: Point;
  angle: number;
  isCaught: boolean;
}

export function createFlyState(width: number, height: number): FlyState {
  return {
    pos: { x: Math.random() * width, y: Math.random() * height },
    vel: { x: 0, y: 0 },
    angle: 0,
    isCaught: false,
  };
}

export function updateFly(
  state: FlyState,
  bounds: { w: number; h: number }
): void {
  if (state.isCaught) return;

  state.vel.x += (Math.random() - 0.5) * FLY.JITTER;
  state.vel.y += (Math.random() - 0.5) * FLY.JITTER;

  const speed = Math.hypot(state.vel.x, state.vel.y);
  if (speed > FLY.SPEED) {
    state.vel.x = (state.vel.x / speed) * FLY.SPEED;
    state.vel.y = (state.vel.y / speed) * FLY.SPEED;
  }

  state.pos.x += state.vel.x;
  state.pos.y += state.vel.y;

  if (state.pos.x < 0) { state.pos.x = 0; state.vel.x *= -1; }
  if (state.pos.x > bounds.w) { state.pos.x = bounds.w; state.vel.x *= -1; }
  if (state.pos.y < 0) { state.pos.y = 0; state.vel.y *= -1; }
  if (state.pos.y > bounds.h) { state.pos.y = bounds.h; state.vel.y *= -1; }

  state.angle = Math.atan2(state.vel.y, state.vel.x);
}

export function checkCatch(
  flyPos: Point,
  headPos: Point
): boolean {
  return Math.hypot(headPos.x - flyPos.x, headPos.y - flyPos.y) < FLY.CATCH_RADIUS;
}

export function respawnFly(state: FlyState, width: number, height: number): void {
  state.isCaught = false;
  state.pos = { x: Math.random() * width, y: Math.random() * height };
  state.vel = { x: 0, y: 0 };
}
