import React, { useState, useCallback } from 'react';
import { useSpiderLoop } from '../spider/useSpiderLoop';

export function SpiderCursor() {
  const [score, setScore] = useState(0);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const onScore = useCallback(() => setScore((s) => s + 1), []);
  useSpiderLoop(canvasRef, onScore);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50"
      />
      <div className="fixed top-8 left-8 z-[60] font-mono text-2xl font-bold text-white/50 border-2 border-white/20 px-4 py-2 rounded-lg backdrop-blur-sm pointer-events-none">
        FLIES CAUGHT: <span className="text-red-500">{score}</span>
      </div>
    </>
  );
}
