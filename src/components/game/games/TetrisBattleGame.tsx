'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  roundData: Record<string, unknown>;
  round: number;
  myUid: string;
  timeLeft: number;
  onSubmit: (score: number, extra?: Record<string, unknown>) => Promise<void>;
}

const COLS = 10;
const ROWS = 16;
const CELL = 20;

const SHAPES = [
  { blocks: [[0,0],[1,0],[2,0],[3,0]], color: '#06b6d4' },
  { blocks: [[0,0],[1,0],[0,1],[1,1]], color: '#eab308' },
  { blocks: [[0,0],[1,0],[2,0],[2,1]], color: '#f97316' },
  { blocks: [[0,0],[1,0],[2,0],[0,1]], color: '#3b82f6' },
  { blocks: [[1,0],[2,0],[0,1],[1,1]], color: '#22c55e' },
  { blocks: [[0,0],[1,0],[1,1],[2,1]], color: '#ef4444' },
  { blocks: [[0,0],[1,0],[2,0],[1,1]], color: '#a855f7' },
];

type Grid = (string | null)[][];

function createGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export default function TetrisBattleGame({ roundData, round, timeLeft, onSubmit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const gridRef = useRef<Grid>(createGrid());
  const pieceRef = useRef<{ blocks: number[][]; color: string; x: number; y: number } | null>(null);
  const scoreRef = useRef(0);
  const dropTimerRef = useRef(0);
  const gameOverRef = useRef(false);
  const rafRef = useRef<number>(0);

  const spawnPiece = useCallback(() => {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    pieceRef.current = {
      blocks: shape.blocks.map((b) => [...b]),
      color: shape.color,
      x: Math.floor(COLS / 2) - 1,
      y: 0,
    };
    if (checkCollision(gridRef.current, pieceRef.current)) {
      gameOverRef.current = true;
    }
  }, []);

  function checkCollision(grid: Grid, piece: typeof pieceRef.current): boolean {
    if (!piece) return false;
    for (const [bx, by] of piece.blocks) {
      const nx = piece.x + bx;
      const ny = piece.y + by;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && grid[ny][nx]) return true;
    }
    return false;
  }

  function lockPiece() {
    const piece = pieceRef.current;
    if (!piece) return;
    const grid = gridRef.current;
    for (const [bx, by] of piece.blocks) {
      const nx = piece.x + bx;
      const ny = piece.y + by;
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
        grid[ny][nx] = piece.color;
      }
    }
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r].every((c) => c !== null)) {
        grid.splice(r, 1);
        grid.unshift(Array(COLS).fill(null));
        cleared++;
        r++;
      }
    }
    if (cleared > 0) {
      const bonus = [0, 10, 30, 60, 100][Math.min(cleared, 4)];
      scoreRef.current += bonus;
      setScore(scoreRef.current);
    }
    spawnPiece();
  }

  function movePiece(dx: number, dy: number): boolean {
    const piece = pieceRef.current;
    if (!piece) return false;
    piece.x += dx;
    piece.y += dy;
    if (checkCollision(gridRef.current, piece)) {
      piece.x -= dx;
      piece.y -= dy;
      return false;
    }
    return true;
  }

  function rotatePiece() {
    const piece = pieceRef.current;
    if (!piece) return;
    const rotated = piece.blocks.map(([x, y]) => [-y, x]);
    const minX = Math.min(...rotated.map(([x]) => x));
    const minY = Math.min(...rotated.map(([, y]) => y));
    const normalized = rotated.map(([x, y]) => [x - minX, y - minY]);
    const old = piece.blocks;
    piece.blocks = normalized;
    if (checkCollision(gridRef.current, piece)) {
      piece.blocks = old;
    }
  }

  function hardDrop() {
    const piece = pieceRef.current;
    if (!piece) return;
    while (movePiece(0, 1)) { /* keep dropping */ }
    lockPiece();
  }

  useEffect(() => {
    setSubmitted(false);
    setScore(0);
    setGameOver(false);
    gridRef.current = createGrid();
    scoreRef.current = 0;
    gameOverRef.current = false;
    dropTimerRef.current = 0;
    spawnPiece();
  }, [round, spawnPiece]);

  useEffect(() => {
    if (submitted || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    const dropInterval = Math.max(150, (roundData?.speed as number) || 500);

    const loop = (now: number) => {
      if (gameOverRef.current) {
        setGameOver(true);
        return;
      }

      const delta = now - lastTime;
      dropTimerRef.current += delta;
      lastTime = now;

      if (dropTimerRef.current >= dropInterval) {
        dropTimerRef.current = 0;
        if (!movePiece(0, 1)) {
          lockPiece();
        }
      }

      ctx.fillStyle = '#0A0A12';
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
        }
      }

      const grid = gridRef.current;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c]) {
            ctx.fillStyle = grid[r][c]!;
            ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
          }
        }
      }

      const piece = pieceRef.current;
      if (piece) {
        ctx.fillStyle = piece.color;
        for (const [bx, by] of piece.blocks) {
          ctx.fillRect((piece.x + bx) * CELL + 1, (piece.y + by) * CELL + 1, CELL - 2, CELL - 2);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [round, submitted, gameOver, roundData]);

  useEffect(() => {
    if (submitted || gameOver) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') movePiece(-1, 0);
      else if (e.key === 'ArrowRight') movePiece(1, 0);
      else if (e.key === 'ArrowUp') rotatePiece();
      else if (e.key === 'ArrowDown') hardDrop();
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
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) { rotatePiece(); return; }
    if (Math.abs(dx) > Math.abs(dy)) {
      movePiece(dx > 0 ? 1 : -1, 0);
    } else if (dy > 30) {
      hardDrop();
    }
    touchStartRef.current = null;
  };

  useEffect(() => {
    if ((gameOver || timeLeft <= 0) && !submitted) {
      setSubmitted(true);
      onSubmit(scoreRef.current, { linesScore: scoreRef.current });
    }
  }, [gameOver, timeLeft, submitted, onSubmit]);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-white/30 text-xs">줄을 지워서 점수를 획득하세요! ← → 이동 / ↑ 회전 / ↓ 드롭</p>
      <div className="text-neon-amber font-bold font-score text-lg">{score}점</div>
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        className="rounded-xl border border-white/[0.06] touch-none"
        style={{ width: COLS * CELL, maxWidth: '100%' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />
      <div className="flex gap-3 md:hidden">
        <button onClick={() => movePiece(-1, 0)} className="px-4 py-2 bg-surface-elevated rounded-lg text-white/60 active:bg-white/10">←</button>
        <button onClick={() => rotatePiece()} className="px-4 py-2 bg-surface-elevated rounded-lg text-white/60 active:bg-white/10">↻</button>
        <button onClick={() => hardDrop()} className="px-4 py-2 bg-surface-elevated rounded-lg text-white/60 active:bg-white/10">↓</button>
        <button onClick={() => movePiece(1, 0)} className="px-4 py-2 bg-surface-elevated rounded-lg text-white/60 active:bg-white/10">→</button>
      </div>
    </div>
  );
}
