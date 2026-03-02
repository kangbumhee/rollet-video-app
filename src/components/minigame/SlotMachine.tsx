'use client';

import { useState } from 'react';

interface Props {
  onResult?: (msg: string) => void;
}

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];

export default function SlotMachine({ onResult }: Props) {
  const [reels, setReels] = useState(['🎰', '🎰', '🎰']);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState('');

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setMessage('');
    setTimeout(() => {
      const r = [0, 1, 2].map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      setReels(r);
      setSpinning(false);
      let msg = '';
      if (r[0] === r[1] && r[1] === r[2]) {
        msg = r[0] === '7️⃣' ? '🎰 JACKPOT!!! 7️⃣7️⃣7️⃣ 대박!' : `🎰 ${r[0]}${r[1]}${r[2]} 3연속! 대단해!`;
      } else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) {
        msg = `🎰 ${r.join('')} 2개 일치! 아쉽~`;
      } else {
        msg = `🎰 ${r.join('')} 꽝!`;
      }
      setMessage(msg);
      onResult?.(msg);
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">🎰 슬롯머신</h3>
      <div className="flex gap-2 bg-gray-900 p-4 rounded-xl">
        {reels.map((s, i) => (
          <div key={i} className={`text-5xl w-16 h-16 flex items-center justify-center bg-gray-700 rounded-lg ${spinning ? 'animate-pulse' : ''}`}>
            {s}
          </div>
        ))}
      </div>
      {message && <p className="text-yellow-400 font-bold">{message}</p>}
      <button
        onClick={spin}
        disabled={spinning}
        className="px-8 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-500 disabled:opacity-50 transition"
      >
        {spinning ? '돌리는 중...' : 'SPIN!'}
      </button>
    </div>
  );
}
