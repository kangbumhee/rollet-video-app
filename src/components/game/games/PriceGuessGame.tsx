'use client';

import { useState, useEffect } from 'react';

interface Props {
  roundData: Record<string, unknown>;
  round: number;
  myUid: string;
  timeLeft: number;
  onSubmit: (score: number, extra?: Record<string, unknown>) => Promise<void>;
}

export default function PriceGuessGame({ roundData, round, onSubmit }: Props) {
  const [guess, setGuess] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const itemName = roundData?.itemName as string | undefined;
  const actualPrice = (roundData?.actualPrice as number) || 0;
  const hint = roundData?.hint as string | undefined;
  const category = roundData?.category as string | undefined;

  useEffect(() => {
    setGuess('');
    setSubmitted(false);
  }, [round]);

  const handleSubmit = () => {
    if (submitted || !guess) return;
    setSubmitted(true);
    const guessNum = parseInt(guess.replace(/,/g, ''), 10) || 0;
    const diff = Math.abs(guessNum - actualPrice);
    const maxPrice = actualPrice || 1;
    const accuracy = Math.max(0, 100 - Math.round((diff / maxPrice) * 100));
    const score = Math.round(accuracy * 1.5);
    onSubmit(score, { guess: guessNum, actual: actualPrice, accuracy });
  };

  const formatNum = (v: string) => {
    const num = v.replace(/[^0-9]/g, '');
    return num ? Number(num).toLocaleString() : '';
  };

  return (
    <div className="max-w-sm mx-auto space-y-6 text-center">
      <div className="text-6xl">{hint || '📦'}</div>
      <div>
        <p className="text-white/30 text-xs">{category}</p>
        <h3 className="text-white font-bold text-xl mt-1">{itemName || '???'}</h3>
      </div>
      <p className="text-white/30 text-sm">이 상품의 가격을 맞춰보세요!</p>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={guess}
          onChange={(e) => setGuess(formatNum(e.target.value))}
          disabled={submitted}
          placeholder="가격 입력"
          className="w-full px-5 py-4 rounded-xl bg-surface-base text-white text-xl text-center font-bold border-2 border-white/[0.06] focus:border-neon-amber/40 outline-none disabled:opacity-50"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">원</span>
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitted || !guess}
        className="w-full py-3 rounded-xl font-bold text-lg bg-neon-amber/15 border border-neon-amber/25 text-neon-amber disabled:opacity-40 hover:bg-neon-amber/25 active:scale-95 transition-all">
        {submitted ? '제출 완료!' : '💰 제출하기'}
      </button>
    </div>
  );
}
