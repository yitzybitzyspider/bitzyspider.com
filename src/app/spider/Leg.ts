import type { Point } from './types';

export class Leg {
  currentFoot: Point;
  targetFoot: Point;
  stepProgress: number;
  isStepping: boolean;
  index: number;

  constructor(index: number, startPos: Point) {
    this.index = index;
    this.currentFoot = { ...startPos };
    this.targetFoot = { ...startPos };
    this.stepProgress = 1;
    this.isStepping = false;
  }
}

export function createLegs(count: number, center: Point): Leg[] {
  return Array.from({ length: count }, (_, i) => new Leg(i, center));
}
