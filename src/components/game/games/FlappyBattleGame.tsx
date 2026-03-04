'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  roundData: Record<string, unknown>;
  round: number;
  myUid: string;
  timeLeft: number;
  onSubmit: (score: number, extra?: Record<string, unknown>) => Promise<void>;
}

const W = 320;
const H = 480;
const BIRD_R = 12;
const GAP = 140;
const PIPE_W = 40;
const GRAVITY = 0.3;
const JUMP = -5.5;

export default function FlappyBattleGame({ roundData, round, timeLeft, onSubmit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const gameRef = useRef<{ y: number; vy: number; pipes: { x: number; topH: number }[]; dist: number; alive: boolean; score: number }>({ y: H / 2, vy: 0, pipes: [], dist: 0, alive: true, score: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    setSubmitted(false);
    setGameOver(false);
    setScore(0);
    setStarted(false);
    gameRef.current = { y: H / 2, vy: 0, pipes: [], dist: 0, alive: true, score: 0 };
  }, [round]);

  const doSubmit = useCallback((finalScore: number) => {
    if (submitted) return;
    setSubmitted(true);
    setGameOver(true);
    onSubmit(finalScore, { distance: finalScore });
  }, [submitted, onSubmit]);

  useEffect(() => {
    if (submitted || gameOver || !started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const speedMult = (roundData?.speedMultiplier as number) || 1;
    const speed = 1.8 * speedMult;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.67, 3);
      lastTime = now;
      const g = gameRef.current;

      if (!g.alive) { doSubmit(g.score); return; }

      g.vy += GRAVITY * dt;
      g.y += g.vy * dt;
      g.dist += speed * dt;

      if (g.pipes.length === 0 || g.pipes[g.pipes.length - 1].x < W - 220) {
        g.pipes.push({ x: W + 20, topH: 60 + Math.random() * (H - GAP - 120) });
      }

      for (const pipe of g.pipes) {
        pipe.x -= speed * dt;
        const birdX = 60;
        if (birdX + BIRD_R > pipe.x && birdX - BIRD_R < pipe.x + PIPE_W) {
          if (g.y - BIRD_R < pipe.topH || g.y + BIRD_R > pipe.topH + GAP) {
            g.alive = false;
          }
        }
        if (Math.abs(birdX - (pipe.x + PIPE_W)) < speed * dt * 2 && pipe.x + PIPE_W < birdX) {
          g.score++;
          setScore(g.score);
        }
      }
      g.pipes = g.pipes.filter((p) => p.x > -PIPE_W - 10);

      if (g.y > H - BIRD_R || g.y < BIRD_R) g.alive = false;

      ctx.fillStyle = '#0A0A12';
      ctx.fillRect(0, 0, W, H);

      for (const pipe of g.pipes) {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(pipe.x, 0, PIPE_W, pipe.topH);
        ctx.fillRect(pipe.x, pipe.topH + GAP, PIPE_W, H - pipe.topH - GAP);
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 2;
        ctx.strokeRect(pipe.x, 0, PIPE_W, pipe.topH);
        ctx.strokeRect(pipe.x, pipe.topH + GAP, PIPE_W, H - pipe.topH - GAP);
      }

      ctx.beginPath();
      ctx.arc(60, g.y, BIRD_R, 0, Math.PI * 2);
      ctx.fillStyle = '#eab308';
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${g.score}`, W / 2, 35);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [round, submitted, gameOver, roundData, doSubmit, started]);

  useEffect(() => {
    if (timeLeft <= 0 && !submitted) {
      if (!started) {
        setSubmitted(true);
        onSubmit(0);
      } else {
        gameRef.current.alive = false;
      }
    }
  }, [timeLeft, submitted, started, onSubmit]);

  const handleJump = () => {
    if (!started) {
      setStarted(true);
      gameRef.current.vy = JUMP;
      return;
    }
    if (gameRef.current.alive) {
      gameRef.current.vy = JUMP;
    }
  };

  if (!started && !gameOver) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="text-6xl">🐦</div>
        <h3 className="text-white font-bold text-lg">플래피 배틀</h3>
        <div className="bg-surface-base rounded-xl p-4 border border-white/[0.06] max-w-xs text-center space-y-2">
          <p className="text-white/60 text-sm">화면을 <span className="text-neon-cyan font-bold">탭/클릭</span>하면 새가 점프합니다!</p>
          <p className="text-white/60 text-sm">초록색 파이프 사이를 통과하세요.</p>
          <p className="text-white/40 text-xs">파이프를 많이 통과할수록 높은 점수!</p>
        </div>
        <button onClick={handleJump}
          className="px-8 py-4 rounded-xl bg-neon-cyan/15 border border-neon-cyan/25 text-neon-cyan font-bold text-lg hover:bg-neon-cyan/25 active:scale-95 transition-all animate-pulse">
          탭하여 시작!
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-white/30 text-xs">탭/클릭으로 점프! 파이프를 피하세요</p>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-xl border border-white/[0.06] touch-none cursor-pointer"
        style={{ width: '100%', maxWidth: 320 }}
        onClick={handleJump}
        onTouchStart={(e) => { e.preventDefault(); handleJump(); }}
      />
      {gameOver && (
        <p className="text-neon-amber font-bold text-lg">게임 오버! 점수: {score}</p>
      )}
    </div>
  );
}
