'use client';

import { useState, useEffect } from 'react';

interface Props {
  roundData: Record<string, unknown>;
  round: number;
  myUid: string;
  timeLeft: number;
  onSubmit: (score: number, extra?: Record<string, unknown>) => Promise<void>;
}

export default function BlindAuctionGame({ roundData, round, onSubmit }: Props) {
  const [bid, setBid] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const chest = roundData?.chest as { type?: string; label?: string; points?: number } | undefined;
  const chestHint = roundData?.chestHint as string | undefined;
  const maxBid = (roundData?.maxBid as number) || 10;
  const max = maxBid || 10;

  useEffect(() => {
    setBid(1);
    setSubmitted(false);
    setRevealed(false);
  }, [round]);

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);

    setTimeout(() => {
      setRevealed(true);
      const points = chest?.points || 0;
      const riskMultiplier = 1 + (bid / max) * 0.5;
      const score = points > 0
        ? Math.round(points * riskMultiplier)
        : Math.round(points * riskMultiplier);
      onSubmit(Math.max(0, score + 10), { bid, chestType: chest?.type, rawPoints: points });
    }, 1000);
  };

  return (
    <div className="max-w-sm mx-auto space-y-6 text-center">
      <div className="text-6xl animate-bounce">📦</div>
      <div className="bg-surface-base rounded-xl p-4 border border-white/[0.06]">
        <p className="text-white/30 text-xs mb-1">상자 힌트</p>
        <p className="text-neon-amber font-bold text-lg">{chestHint || '???'}</p>
      </div>
      {!submitted ? (
        <>
          <div className="space-y-2">
            <p className="text-white/40 text-sm">베팅 칩: <span className="text-white font-bold font-score">{bid}</span> / {max}</p>
            <input
              type="range"
              min={1}
              max={max}
              value={bid}
              onChange={(e) => setBid(Number(e.target.value))}
              className="w-full accent-neon-magenta"
            />
            <div className="flex justify-between text-xs text-white/20">
              <span>안전 (1)</span>
              <span>올인 ({max})</span>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl font-bold bg-neon-magenta/15 border border-neon-magenta/25 text-neon-magenta hover:bg-neon-magenta/25 active:scale-95 transition-all">
            🎲 베팅하기!
          </button>
        </>
      ) : !revealed ? (
        <div className="py-8">
          <div className="text-4xl animate-spin">📦</div>
          <p className="text-white/30 text-sm mt-2">상자 여는 중...</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-3xl">{chest?.type === 'trap' || chest?.type === 'bomb' ? '💀' : chest?.type === 'gold' ? '💎' : '📦'}</p>
          <p className="text-white font-bold text-lg">{chest?.label || '결과'}</p>
          <p className="text-neon-amber font-score">{chest?.points || 0}점 × 리스크 보너스</p>
        </div>
      )}
    </div>
  );
}
