'use client';

import { useState } from 'react';

interface Props {
  onResult?: (msg: string) => void;
}

export default function CoinFlip({ onResult }: Props) {
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [guess, setGuess] = useState<'heads' | 'tails' | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [score, setScore] = useState({ wins: 0, total: 0 });

  const flip = (myGuess: 'heads' | 'tails') => {
    if (flipping) return;
    setGuess(myGuess);
    setFlipping(true);
    setResult(null);

    setTimeout(() => {
      const coin = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = coin === myGuess;
      setResult(coin);
      setFlipping(false);
      setScore((prev) => ({
        wins: prev.wins + (won ? 1 : 0),
        total: prev.total + 1,
      }));
      if (won) {
        onResult?.(`🪙 동전 던지기 성공! ${myGuess === 'heads' ? '앞면' : '뒷면'} 적중!`);
      }
    }, 1000);
  };

  const won = result && guess && result === guess;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 text-center">
      <p className="text-sm text-gray-400 mb-4">동전 던지기 🪙</p>

      <div className={`text-6xl my-6 ${flipping ? 'animate-spin' : ''}`}>
        {flipping ? '🪙' : result === 'heads' ? '😀' : result === 'tails' ? '🌟' : '🪙'}
      </div>

      {result && !flipping && (
        <p className={`text-lg font-bold mb-4 ${won ? 'text-green-400' : 'text-red-400'}`}>
          {result === 'heads' ? '앞면!' : '뒷면!'} {won ? '맞았어요! 🎉' : '틀렸어요 😢'}
        </p>
      )}

      <div className="flex gap-3 justify-center mb-4">
        <button
          onClick={() => flip('heads')}
          disabled={flipping}
          className="px-6 py-2.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded-xl
                     hover:bg-yellow-500/30 active:scale-95 disabled:opacity-50 transition-all text-sm font-medium"
        >
          😀 앞면
        </button>
        <button
          onClick={() => flip('tails')}
          disabled={flipping}
          className="px-6 py-2.5 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded-xl
                     hover:bg-purple-500/30 active:scale-95 disabled:opacity-50 transition-all text-sm font-medium"
        >
          🌟 뒷면
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {score.total}전 {score.wins}승
      </p>
    </div>
  );
}
