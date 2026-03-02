'use client';

import { useState } from 'react';

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🔔', '⭐'];

interface Props {
  onResult?: (msg: string) => void;
}

export default function SlotMachine({ onResult }: Props) {
  const [reels, setReels] = useState(['❓', '❓', '❓']);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState('');

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setMessage('');

    const intervals = reels.map((_, i) =>
      setInterval(() => {
        setReels((prev) => {
          const next = [...prev];
          next[i] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          return next;
        });
      }, 80)
    );

    setTimeout(() => clearInterval(intervals[0]), 600);
    setTimeout(() => clearInterval(intervals[1]), 1000);
    setTimeout(() => {
      clearInterval(intervals[2]);
      setSpinning(false);

      setReels((final) => {
        if (final[0] === final[1] && final[1] === final[2]) {
          setMessage(final[0] === '7️⃣' ? '🎊 JACKPOT! 대박!' : '🎉 3개 일치! 대단해요!');
          onResult?.(`🎰 슬롯머신 ${final[0]}${final[1]}${final[2]} 대박!!!`);
        } else if (final[0] === final[1] || final[1] === final[2] || final[0] === final[2]) {
          setMessage('👍 2개 일치! 아깝다!');
        } else {
          setMessage('😅 다시 도전!');
        }
        return final;
      });
    }, 1400);
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 text-center">
      <p className="text-sm text-gray-400 mb-4">슬롯머신 🎰</p>

      <div className="flex justify-center gap-3 my-6">
        {reels.map((symbol, i) => (
          <div
            key={i}
            className="w-16 h-16 bg-gray-900 border-2 border-yellow-500/30 rounded-xl flex items-center justify-center text-3xl"
          >
            {symbol}
          </div>
        ))}
      </div>

      {message && (
        <p
          className={`text-sm font-bold mb-4 ${
            message.includes('JACKPOT') || message.includes('3개')
              ? 'text-yellow-400'
              : message.includes('2개')
                ? 'text-blue-400'
                : 'text-gray-400'
          }`}
        >
          {message}
        </p>
      )}

      <button
        onClick={spin}
        disabled={spinning}
        className="px-8 py-2.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded-xl
                   hover:bg-yellow-500/30 active:scale-95 disabled:opacity-50 transition-all text-sm font-medium"
      >
        {spinning ? '돌리는 중...' : '🎰 SPIN!'}
      </button>
    </div>
  );
}
