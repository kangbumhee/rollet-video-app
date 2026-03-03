'use client';

import { useState } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

interface Props { onResult: (msg: string) => void; }

const BALLS = ['W', 'R', 'Y', 'G', 'B', 'P', 'S', 'D'];
const BALL_SCORES: Record<string, number> = { W: 1, R: 3, Y: 5, G: 7, B: 10, P: 15, S: 25, D: 50 };
const WEIGHTS = [30, 25, 15, 10, 8, 5, 4, 3];

function pickBall(): string {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < WEIGHTS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return BALLS[i];
  }
  return BALLS[0];
}

export default function RockDraw({ onResult }: Props) {
  const [drawn, setDrawn] = useState<string[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const TOTAL_ROUNDS = 3;

  const draw = () => {
    soundManager.play('click');
    setDrawing(true);
    setDrawn([]);
    setCombo(null);
    const results: string[] = [];
    setTimeout(() => {
      results.push(pickBall());
      setDrawn([...results]);
      soundManager.play('coin-flip');
      if (results.length === 1) {
        setTimeout(() => {
          results.push(pickBall());
          setDrawn([...results]);
          soundManager.play('coin-flip');
          if (results.length === 2) {
            setTimeout(() => {
              results.push(pickBall());
              setDrawn([...results]);
              soundManager.play('coin-flip');
              let pts = results.reduce((sum, b) => sum + (BALL_SCORES[b] ?? 0), 0);
              if (results[0] === results[1] && results[1] === results[2]) {
                pts *= 3;
                setCombo('트리플!');
              }
              setScore(pts);
              setTotalScore((p) => p + pts);
              setDrawing(false);
              if (pts >= 50) soundManager.play('cash-register');
            }, 600);
          }
        }, 600);
      }
    }, 600);
  };

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
      onResult(totalScore + '점');
      return;
    }
    setRound((r) => r + 1);
    setDrawn([]);
    setScore(0);
    setCombo(null);
  };

  if (gameOver) {
    return (
      <div className="text-center p-4">
        <div className="text-5xl mb-3">🎱</div>
        <p className="text-yellow-400 text-2xl font-bold">{totalScore}점</p>
        <button onClick={() => { setGameOver(false); setRound(1); setTotalScore(0); setDrawn([]); setScore(0); setCombo(null); }} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold">다시하기</button>
      </div>
    );
  }

  return (
    <div className="text-center p-4">
      <p className="text-gray-400 text-xs mb-2">라운드 {round}/{TOTAL_ROUNDS} | 총점: {totalScore}</p>
      <div className="flex justify-center gap-3 mb-4">
        <div className="w-16 h-16 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center text-2xl">{drawn[0] ?? '?'}</div>
        <div className="w-16 h-16 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center text-2xl">{drawn[1] ?? '?'}</div>
        <div className="w-16 h-16 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center text-2xl">{drawn[2] ?? '?'}</div>
      </div>
      {score > 0 && !drawing && (
        <div className="mb-3">
          {combo && <p className="text-yellow-400 font-bold mb-1">{combo}</p>}
          <p className="text-green-400 text-xl font-bold">+{score}점</p>
          <button onClick={nextRound} className="mt-2 px-6 py-2 bg-green-600 text-white rounded-xl font-bold">{round >= TOTAL_ROUNDS ? '결과 보기' : '다음'}</button>
        </div>
      )}
      {drawn.length === 0 && !drawing && <button onClick={draw} className="px-8 py-3 bg-pink-600 text-white rounded-xl font-bold text-lg">뽑기!</button>}
      {drawing && <p className="text-gray-400 animate-pulse">뽑는 중...</p>}
    </div>
  );
}
