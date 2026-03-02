'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Obstacle { x: number; y: number; w: number; h: number }
interface LineRunnerGameProps {
  obstacles: Obstacle[];
  speedMultiplier: number;
  onResult: (distance: number) => void;
  timeLimit: number;
}

export default function LineRunnerGame({ obstacles, speedMultiplier, onResult, timeLimit }: LineRunnerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [distance, setDistance] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const gameStateRef = useRef({
    playerY: 200,
    cameraX: 0,
    trail: [] as Array<{ x: number; y: number }>,
    dead: false,
    dist: 0,
  });
  const animFrameRef = useRef<number>(0);

  const WIDTH = 380;
  const HEIGHT = 400;

  const getYFromEvent = useCallback((e: React.TouchEvent | React.MouseEvent): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 200;
    const rect = canvas.getBoundingClientRect();
    const scaleY = HEIGHT / rect.height;
    if ('touches' in e) {
      return (e.touches[0].clientY - rect.top) * scaleY;
    }
    return (e.clientY - rect.top) * scaleY;
  }, []);

  const finishGame = useCallback(() => {
    if (gameStateRef.current.dead) return;
    gameStateRef.current.dead = true;
    setGameOver(true);
    setDistance(Math.floor(gameStateRef.current.dist));
    onResult(Math.floor(gameStateRef.current.dist));
  }, [onResult]);

  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver, finishGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = gameStateRef.current;

    const loop = () => {
      if (state.dead) return;

      const speed = 3 * speedMultiplier;
      state.cameraX += speed;
      state.dist = state.cameraX / 10;
      setDistance(Math.floor(state.dist));

      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = '#1a1a3a';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < HEIGHT; i += 30) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(WIDTH, i);
        ctx.stroke();
      }

      ctx.fillStyle = '#ff4444';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 10;
      for (const obs of obstacles) {
        const screenX = obs.x - state.cameraX;
        if (screenX > -obs.w && screenX < WIDTH + obs.w) {
          ctx.fillRect(screenX, obs.y, obs.w, obs.h);
          const px = 60;
          const py = state.playerY;
          if (px + 4 > screenX && px - 4 < screenX + obs.w && py + 4 > obs.y && py - 4 < obs.y + obs.h) {
            state.dead = true;
            setGameOver(true);
            setDistance(Math.floor(state.dist));
            onResult(Math.floor(state.dist));
            return;
          }
        }
      }
      ctx.shadowBlur = 0;

      state.trail.push({ x: 60, y: state.playerY });
      if (state.trail.length > 80) state.trail.shift();

      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00ffaa';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < state.trail.length; i++) {
        const t = state.trail[i];
        if (i === 0) ctx.moveTo(t.x, t.y);
        else ctx.lineTo(t.x, t.y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(60, state.playerY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffaa';
      ctx.shadowColor = '#00ffaa';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`${Math.floor(state.dist)}m`, WIDTH - 70, 25);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [obstacles, speedMultiplier, onResult]);

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameOver) return;
    e.preventDefault();
    const y = getYFromEvent(e);
    gameStateRef.current.playerY = Math.max(10, Math.min(HEIGHT - 10, y));
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameOver) return;
    e.preventDefault();
    setIsDrawing(true);
    const y = getYFromEvent(e);
    gameStateRef.current.playerY = Math.max(10, Math.min(HEIGHT - 10, y));
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center justify-between w-full px-2">
        <span className="text-green-400 font-bold text-lg">✏️ {distance}m</span>
        <span className={`font-bold text-lg ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
          ⏱ {timeLeft}초
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="rounded-xl border-2 border-gray-700 touch-none"
        style={{ width: '100%', maxWidth: WIDTH, aspectRatio: `${WIDTH}/${HEIGHT}` }}
        onMouseDown={handleStart}
        onMouseMove={isDrawing ? handleMove : undefined}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />

      {gameOver && (
        <div className="text-center py-3 animate-fade-in">
          <p className="text-red-400 text-2xl font-bold">💥 충돌!</p>
          <p className="text-white text-lg mt-1">기록: <span className="text-green-400 font-bold">{distance}m</span></p>
        </div>
      )}

      {!gameOver && (
        <p className="text-gray-500 text-xs">손가락(마우스)으로 드래그하여 장애물을 피하세요!</p>
      )}
    </div>
  );
}
