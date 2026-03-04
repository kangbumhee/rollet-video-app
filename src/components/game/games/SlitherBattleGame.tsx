'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  roundData: Record<string, unknown>;
  round: number;
  myUid: string;
  timeLeft: number;
  onSubmit: (score: number, extra?: Record<string, unknown>) => Promise<void>;
}

const GRID = 20;
const CELL = 16;

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Pos = { x: number; y: number };

export default function SlitherBattleGame({ roundData, round, timeLeft, onSubmit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const snakeRef = useRef<Pos[]>([{ x: 10, y: 10 }]);
  const dirRef = useRef<Dir>('RIGHT');
  const foodsRef = useRef<Pos[]>([]);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const spawnFood = useCallback(() => {
    const x = Math.floor(Math.random() * GRID);
    const y = Math.floor(Math.random() * GRID);
    return { x, y };
  }, []);

  useEffect(() => {
    setSubmitted(false);
    setScore(0);
    setGameOver(false);
    snakeRef.current = [{ x: 10, y: 10 }];
    dirRef.current = 'RIGHT';
    scoreRef.current = 0;
    gameOverRef.current = false;

    const initialFoods = (roundData?.initialFoods as Pos[]) || [];
    foodsRef.current = initialFoods.length > 0 ? [...initialFoods] : [spawnFood(), spawnFood(), spawnFood()];
  }, [round, roundData, spawnFood]);

  useEffect(() => {
    if (submitted || gameOver) return;

    intervalRef.current = setInterval(() => {
      if (gameOverRef.current) return;
      const snake = snakeRef.current;
      const head = { ...snake[0] };
      const dir = dirRef.current;

      if (dir === 'UP') head.y--;
      else if (dir === 'DOWN') head.y++;
      else if (dir === 'LEFT') head.x--;
      else if (dir === 'RIGHT') head.x++;

      if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
        gameOverRef.current = true;
        setGameOver(true);
        return;
      }

      if (snake.some((s) => s.x === head.x && s.y === head.y)) {
        gameOverRef.current = true;
        setGameOver(true);
        return;
      }

      snake.unshift(head);

      const foodIdx = foodsRef.current.findIndex((f) => f.x === head.x && f.y === head.y);
      if (foodIdx >= 0) {
        foodsRef.current.splice(foodIdx, 1);
        foodsRef.current.push(spawnFood());
        scoreRef.current += 5;
        setScore(scoreRef.current);
      } else {
        snake.pop();
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#0A0A12';
      ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);

      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
        }
      }

      for (const food of foodsRef.current) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
      }

      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#22c55e' : '#16a34a';
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      });

    }, 150);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [round, submitted, gameOver, spawnFood]);

  useEffect(() => {
    if (submitted || gameOver) return;
    const handleKey = (e: KeyboardEvent) => {
      const d = dirRef.current;
      if (e.key === 'ArrowUp' && d !== 'DOWN') dirRef.current = 'UP';
      else if (e.key === 'ArrowDown' && d !== 'UP') dirRef.current = 'DOWN';
      else if (e.key === 'ArrowLeft' && d !== 'RIGHT') dirRef.current = 'LEFT';
      else if (e.key === 'ArrowRight' && d !== 'LEFT') dirRef.current = 'RIGHT';
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [submitted, gameOver]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const d = dirRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20 && d !== 'LEFT') dirRef.current = 'RIGHT';
      else if (dx < -20 && d !== 'RIGHT') dirRef.current = 'LEFT';
    } else {
      if (dy > 20 && d !== 'UP') dirRef.current = 'DOWN';
      else if (dy < -20 && d !== 'DOWN') dirRef.current = 'UP';
    }
    touchStartRef.current = null;
  };

  useEffect(() => {
    if ((gameOver || timeLeft <= 0) && !submitted) {
      setSubmitted(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      onSubmit(scoreRef.current, { snakeScore: scoreRef.current });
    }
  }, [gameOver, timeLeft, submitted, onSubmit]);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-white/30 text-xs">스와이프/화살표로 뱀을 조종하세요! 빨간 먹이를 먹어요</p>
      <div className="text-neon-amber font-bold font-score text-lg">{score}점</div>
      <canvas
        ref={canvasRef}
        width={GRID * CELL}
        height={GRID * CELL}
        className="rounded-xl border border-white/[0.06] touch-none"
        style={{ width: GRID * CELL, maxWidth: '100%' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />
      <div className="grid grid-cols-3 gap-1 w-36 md:hidden">
        <div />
        <button onClick={() => { if (dirRef.current !== 'DOWN') dirRef.current = 'UP'; }}
          className="py-2 bg-surface-elevated rounded text-white/60 active:bg-white/10 text-center">↑</button>
        <div />
        <button onClick={() => { if (dirRef.current !== 'RIGHT') dirRef.current = 'LEFT'; }}
          className="py-2 bg-surface-elevated rounded text-white/60 active:bg-white/10 text-center">←</button>
        <div />
        <button onClick={() => { if (dirRef.current !== 'LEFT') dirRef.current = 'RIGHT'; }}
          className="py-2 bg-surface-elevated rounded text-white/60 active:bg-white/10 text-center">→</button>
        <div />
        <button onClick={() => { if (dirRef.current !== 'UP') dirRef.current = 'DOWN'; }}
          className="py-2 bg-surface-elevated rounded text-white/60 active:bg-white/10 text-center">↓</button>
        <div />
      </div>
    </div>
  );
}
