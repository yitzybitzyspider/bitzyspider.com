import { SPIDER, FLY, LEG_ORIGINS } from './constants';
import type { Leg } from './Leg';
import type { FlyState } from './fly';
import type { Point, WebPoint } from './types';

const { BODY_SIZE, HEAD_SIZE } = SPIDER;

export function drawFly(ctx: CanvasRenderingContext2D, fly: FlyState, time: number): void {
  if (fly.isCaught) return;
  ctx.save();
  ctx.translate(fly.pos.x, fly.pos.y);
  ctx.rotate(fly.angle);

  const wingScale = Math.sin(time * 0.5);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.save();
  ctx.scale(1, wingScale);
  ctx.beginPath();
  ctx.ellipse(-2, -6, 4, 8, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-2, 6, 4, 8, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.ellipse(0, 0, FLY.SIZE, FLY.SIZE / 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'red';
  ctx.beginPath(); ctx.arc(3, -2, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, 2, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawSpider(
  ctx: CanvasRenderingContext2D,
  bodyPos: Point,
  bodyAngle: number,
  legs: Leg[],
  flyPos: Point,
  isFlyCaught: boolean
): void {
  const cos = Math.cos(bodyAngle);
  const sin = Math.sin(bodyAngle);

  legs.forEach((leg, i) => {
    const originOff = LEG_ORIGINS[i];
    const attachX = bodyPos.x + (originOff.x * cos - originOff.y * sin);
    const attachY = bodyPos.y + (originOff.x * sin + originOff.y * cos);
    const footX = leg.currentFoot.x;
    const footY = leg.currentFoot.y;
    const legDx = footX - attachX;
    const legDy = footY - attachY;
    const isRightSide = originOff.y < 0;
    const perpX = -legDy;
    const perpY = legDx;
    const len = Math.hypot(legDx, legDy);
    const nx = len > 0 ? perpX / len : 0;
    const ny = len > 0 ? perpY / len : 0;
    const sideFactor = isRightSide ? -1 : 1;

    const p2x = attachX + legDx * 0.35 + nx * 20 * sideFactor;
    const p2y = attachY + legDy * 0.35 + ny * 20 * sideFactor;
    const p3x = attachX + legDx * 0.7 + nx * 15 * sideFactor;
    const p3y = attachY + legDy * 0.7 + ny * 15 * sideFactor;

    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(attachX, attachY);
    ctx.lineTo(p2x, p2y);
    ctx.lineTo(p3x, p3y);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    ctx.fillStyle = '#ff4444';
    ctx.beginPath(); ctx.arc(attachX, attachY, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p2x, p2y, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p3x, p3y, 1.5, 0, Math.PI * 2); ctx.fill();
  });

  ctx.save();
  ctx.translate(bodyPos.x, bodyPos.y);
  ctx.rotate(bodyAngle);

  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-5, 0, BODY_SIZE, BODY_SIZE * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.moveTo(-10, -5); ctx.lineTo(-2, 0); ctx.lineTo(-10, 5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -5); ctx.lineTo(-4, 0); ctx.lineTo(4, 5);
  ctx.fill();

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(15, 0, HEAD_SIZE, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const angleToFly = Math.atan2(flyPos.y - bodyPos.y, flyPos.x - bodyPos.x);
  let localLookAngle = angleToFly - bodyAngle;
  while (localLookAngle > Math.PI) localLookAngle -= Math.PI * 2;
  while (localLookAngle < -Math.PI) localLookAngle += Math.PI * 2;
  const pupilDist = 2.5;
  const pupilOffsetX = Math.cos(localLookAngle) * pupilDist;
  const pupilOffsetY = Math.sin(localLookAngle) * pupilDist;

  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(19, -5, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(19, 5, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(19 + pupilOffsetX, -5 + pupilOffsetY, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(19 + pupilOffsetX, 5 + pupilOffsetY, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(20, -6, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(20, 4, 1, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(17, 0, 3, 0.8, -0.8, true);
  ctx.stroke();

  if (isFlyCaught) {
    ctx.strokeStyle = '#44ff44';
    ctx.beginPath();
    ctx.moveTo(25, -5); ctx.lineTo(30, -8);
    ctx.moveTo(25, 5); ctx.lineTo(30, 8);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawWeb(
  ctx: CanvasRenderingContext2D,
  webPoints: WebPoint[],
  bodyPos: Point,
  now: number
): void {
  ctx.globalCompositeOperation = 'destination-over';
  ctx.lineWidth = 1;
  const WEB_LIFETIME = SPIDER.WEB_LIFETIME;

  webPoints.forEach((p1, i) => {
    const age = now - p1.time;
    const lifeStart = 1 - age / WEB_LIFETIME;
    const distToBody = Math.hypot(bodyPos.x - p1.x, bodyPos.y - p1.y);
    if (distToBody < 150) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * lifeStart})`;
      ctx.moveTo(bodyPos.x, bodyPos.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    for (let j = i + 1; j < webPoints.length; j++) {
      if (j - i > 20) break;
      const p2 = webPoints[j];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (dist < 80) {
        const age2 = now - p2.time;
        const lifeEnd = 1 - age2 / WEB_LIFETIME;
        const alpha = (lifeStart + lifeEnd) / 2;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * alpha})`;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  });
  ctx.globalCompositeOperation = 'source-over';
}
