'use client';
import { useState } from 'react';

interface Props {
  onResult?: (msg: string) => void;
}

export default function CoinFlip({ onResult }: Props) {
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [guess, setGuess] = useState<'heads' | 'tails' | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [wins, setWins] = useState(0);
  const [total, setTotal] = useState(0);

  const flip = (g: 'heads' | 'tails') => {
    if (flipping) return;
    setGuess(g);
    setFlipping(true);
    setResult(null);

    setTimeout(() => {
      const r = Math.random() < 0.5 ? 'heads' : 'tails';
      setResult(r);
      setFlipping(false);
      const won = r === g;
      if (won) setWins((p) => p + 1);
      setTotal((p) => p + 1);
      const label = r === 'heads' ? '앞면' : '뒷면';
      onResult?.(
        won
          ? `🪙 동전 ${label}! 맞췄다! (${wins + 1}/${total + 1})`
          : `🪙 동전 ${label}! 아쉽~ (${wins}/${total + 1})`
      );
    }, 800);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">🪙 동전 던지기</h3>
      <div className={`text-6xl transition-transform duration-500 ${flipping ? 'animate-spin' : ''}`}>
        {result === null ? '🪙' : result === 'heads' ? '😀' : '🌙'}
      </div>
      {result && (
        <p className={`text-lg font-bold ${result === guess ? 'text-green-400' : 'text-red-400'}`}>
          {result === 'heads' ? '앞면' : '뒷면'}! {result === guess ? '정답!' : '오답!'}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => flip('heads')}
          disabled={flipping}
          className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-bold hover:bg-yellow-500 disabled:opacity-50 transition"
        >
          😀 앞면
        </button>
        <button
          onClick={() => flip('tails')}
          disabled={flipping}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 disabled:opacity-50 transition"
        >
          뒷면 🌙
        </button>
      </div>
      <p className="text-gray-400 text-sm">전적: {wins}승 / {total}전</p>
    </div>
  );
}
