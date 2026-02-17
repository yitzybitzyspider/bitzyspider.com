import { useEffect, useRef } from 'react';
import { SPIDER, FLY } from './constants';
import { createLegs } from './Leg';
import { createFlyState, updateFly, checkCatch, respawnFly } from './fly';
import { updateBody, getHeadPosition, updateLegs } from './spiderPhysics';
import { drawFly, drawSpider, drawWeb } from './draw';
import type { Point, WebPoint } from './types';
import type { FlyState } from './fly';
import type { Leg } from './Leg';

export function useSpiderLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onScore: () => void
): void {
  const onScoreRef = useRef(onScore);
  onScoreRef.current = onScore;

  const bodyPos = useRef<Point>({ x: 0, y: 0 });
  const bodyAngle = useRef(0);
  const targetPos = useRef<Point>({ x: 0, y: 0 });
  const lastInputTime = useRef(0);
  const lastWebPos = useRef<Point>({ x: 0, y: 0 });
  const webPoints = useRef<WebPoint[]>([]);
  const flyRef = useRef<FlyState | null>(null);
  const legsRef = useRef<Leg[]>([]);
  const respawnAt = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    bodyPos.current = { x: w / 2, y: h / 2 };
    targetPos.current = { x: w / 2, y: h / 2 };
    lastWebPos.current = { x: w / 2, y: h / 2 };
    lastInputTime.current = Date.now();
    flyRef.current = createFlyState(w, h);
    legsRef.current = createLegs(SPIDER.LEG_COUNT, { x: w / 2, y: h / 2 });

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) document.body.style.cursor = 'none';

    const updateTarget = (x: number, y: number) => {
      targetPos.current = { x, y };
      lastInputTime.current = Date.now();
    };

    const onMouseMove = (e: MouseEvent) => updateTarget(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateTarget(e.touches[0].clientX, e.touches[0].clientY - 50);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) updateTarget(e.touches[0].clientX, e.touches[0].clientY - 50);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });

    const onResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', onResize);
    onResize();

    let animationFrameId: number;
    const loop = () => {
      timeRef.current += 1;
      const now = Date.now();
      const ctx = canvas.getContext('2d');
      const fly = flyRef.current;
      const legs = legsRef.current;
      if (!ctx || !fly) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      const bounds = { w: canvas.width, h: canvas.height };
      const isAutoHunting = now - lastInputTime.current > SPIDER.AUTO_HUNT_DELAY;

      if (isAutoHunting && !fly.isCaught) {
        targetPos.current.x = fly.pos.x;
        targetPos.current.y = fly.pos.y;
      }

      if (!fly.isCaught) {
        updateFly(fly, bounds);
        const head = getHeadPosition(bodyPos.current, bodyAngle.current);
        if (checkCatch(fly.pos, head)) {
          fly.isCaught = true;
          onScoreRef.current();
          respawnAt.current = now + FLY.RESPAWN_MS;
        }
      } else if (now >= respawnAt.current) {
        respawnFly(fly, bounds.w, bounds.h);
      }

      updateBody(bodyPos.current, bodyAngle, targetPos.current, isAutoHunting);
      updateLegs(legs, bodyPos.current, bodyAngle.current);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const distMoved = Math.hypot(
        bodyPos.current.x - lastWebPos.current.x,
        bodyPos.current.y - lastWebPos.current.y
      );
      if (distMoved > 20) {
        webPoints.current.push({ x: bodyPos.current.x, y: bodyPos.current.y, time: now });
        lastWebPos.current = { ...bodyPos.current };
      }
      webPoints.current = webPoints.current.filter((p) => now - p.time < SPIDER.WEB_LIFETIME);

      drawWeb(ctx, webPoints.current, bodyPos.current, now);
      drawFly(ctx, fly, timeRef.current);
      drawSpider(ctx, bodyPos.current, bodyAngle.current, legs, fly.pos, fly.isCaught);

      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      document.body.style.cursor = 'auto';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [canvasRef]);
}
