import { SPIDER, LEG_ORIGINS, LEG_TARGETS } from './constants';
import type { Leg } from './Leg';
import type { Point } from './types';

export function updateBody(
  bodyPos: Point,
  bodyAngle: { current: number },
  targetPos: Point,
  isAutoHunting: boolean
): void {
  const dx = targetPos.x - bodyPos.x;
  const dy = targetPos.y - bodyPos.y;
  const speedFactor = isAutoHunting ? 0.03 : 0.1;
  bodyPos.x += dx * speedFactor;
  bodyPos.y += dy * speedFactor;

  const targetAngle = Math.atan2(dy, dx);
  let deltaAngle = targetAngle - bodyAngle.current;
  while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
  while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
  if (Math.hypot(dx, dy) > 1) {
    bodyAngle.current += deltaAngle * 0.15;
  }
}

export function getHeadPosition(bodyPos: Point, bodyAngle: number): Point {
  return {
    x: bodyPos.x + 15 * Math.cos(bodyAngle),
    y: bodyPos.y + 15 * Math.sin(bodyAngle),
  };
}

export function updateLegs(
  legs: Leg[],
  bodyPos: Point,
  bodyAngle: number
): void {
  const cos = Math.cos(bodyAngle);
  const sin = Math.sin(bodyAngle);

  legs.forEach((leg, i) => {
    const originOff = LEG_ORIGINS[i];
    const attachX = bodyPos.x + (originOff.x * cos - originOff.y * sin);
    const attachY = bodyPos.y + (originOff.x * sin + originOff.y * cos);

    const targetOff = LEG_TARGETS[i];
    const idealX = bodyPos.x + (targetOff.x * cos - targetOff.y * sin);
    const idealY = bodyPos.y + (targetOff.x * sin + targetOff.y * cos);

    const distToIdeal = Math.hypot(leg.currentFoot.x - idealX, leg.currentFoot.y - idealY);

    if (!leg.isStepping && distToIdeal > SPIDER.STEP_THRESHOLD) {
      leg.isStepping = true;
      leg.targetFoot = { x: idealX, y: idealY };
      leg.stepProgress = 0;
    }

    if (leg.isStepping) {
      leg.stepProgress += SPIDER.STEP_SPEED;
      if (leg.stepProgress >= 1) {
        leg.stepProgress = 1;
        leg.isStepping = false;
        leg.currentFoot = { ...leg.targetFoot };
      } else {
        leg.currentFoot.x += (leg.targetFoot.x - leg.currentFoot.x) * SPIDER.STEP_SPEED;
        leg.currentFoot.y += (leg.targetFoot.y - leg.currentFoot.y) * SPIDER.STEP_SPEED;
      }
    }
  });
}
