'use client';

import { useState, useRef } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

interface Props { onResult: (msg: string) => void; }

const PRIZES = [
  { label: '10', value: 10, color: '#6b7280' },
  { label: '25', value: 25, color: '#3b82f6' },
  { label: '50', value: 50, color: '#8b5cf6' },
  { label: 'X', value: -30, color: '#ef4444' },
  { label: '100', value: 100, color: '#f59e0b' },
  { label: '5', value: 5, color: '#374151' },
  { label: '75', value: 75, color: '#ec4899' },
  { label: 'X', value: -50, color: '#dc2626' },
];

export default function FortuneWheel({ onResult }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const spinRef = useRef(false);
  const TOTAL_ROUNDS = 3;

  const spin = () => {
    if (spinRef.current) return;
    spinRef.current = true;
    setSpinning(true);
    setResult(null);
    soundManager.play('dice-roll');
    const targetIdx = Math.floor(Math.random() * PRIZES.length);
    const segAngle = 360 / PRIZES.length;
    const targetAngle = 5 * 360 + (360 - targetIdx * segAngle - segAngle / 2);
    setRotation((p) => p + targetAngle);
    setTimeout(() => {
      const prize = PRIZES[targetIdx];
      setResult(prize.value);
      setTotalScore((p) => p + prize.value);
      setSpinning(false);
      spinRef.current = false;
      if (prize.value > 0) soundManager.play('cash-register');
      else soundManager.play('wrong');
    }, 4000);
  };

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
      onResult(Math.max(0, totalScore) + '점');
      return;
    }
    setRound((r) => r + 1);
    setResult(null);
  };

  if (gameOver) {
    return (
      <div className="text-center p-4">
        <div className="text-5xl mb-3">🎡</div>
        <p className="text-white text-lg font-bold">최종 점수</p>
        <p className="text-yellow-400 text-2xl font-bold">{Math.max(0, totalScore)}점</p>
        <button onClick={() => { setGameOver(false); setRound(1); setTotalScore(0); setResult(null); setRotation(0); }} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold">다시하기</button>
      </div>
    );
  }

  const gradient = PRIZES.map((p, i) => p.color + ' ' + (i * 100) / PRIZES.length + '% ' + ((i + 1) * 100) / PRIZES.length + '%').join(', ');

  return (
    <div className="text-center p-4">
      <p className="text-gray-400 text-xs mb-2">라운드 {round}/{TOTAL_ROUNDS} | 총점: {totalScore}</p>
      <div className="relative w-48 h-48 mx-auto mb-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-2 text-xl z-10">▼</div>
        <div className="w-full h-full rounded-full border-4 border-yellow-500 overflow-hidden transition-transform" style={{ transform: 'rotate(' + rotation + 'deg)', transitionDuration: spinning ? '4s' : '0s', transitionTimingFunction: 'cubic-bezier(0.2,0.8,0.3,1)' }}>
          <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(' + gradient + ')' }} />
          <div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 rounded-full bg-white shadow-lg" /></div>
        </div>
      </div>
      {result !== null ? (
        <div className="mb-4">
          <p className={result > 0 ? 'text-green-400 text-xl font-bold' : 'text-red-400 text-xl font-bold'}>{result > 0 ? '+' + result + '점!' : result + '점'}</p>
          <button onClick={nextRound} className="mt-3 px-6 py-2 bg-green-600 text-white rounded-xl font-bold">{round >= TOTAL_ROUNDS ? '결과 보기' : '다음'}</button>
        </div>
      ) : (
        <button onClick={spin} disabled={spinning} className="px-8 py-3 bg-yellow-500 text-black rounded-xl font-bold text-lg disabled:opacity-50">{spinning ? '돌아가는 중...' : '돌리기!'}</button>
      )}
    </div>
  );
}
