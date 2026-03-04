'use client';

import { useState, useEffect, useMemo } from 'react';

interface Props {
  roundData: Record<string, unknown>;
  round: number;
  myUid: string;
  timeLeft: number;
  onSubmit: (score: number, extra?: Record<string, unknown>) => Promise<void>;
  scores: Record<string, number>;
  nameMap: Record<string, string>;
}

const DEFAULT_SEGMENTS = [
  { label: '×2', mult: 2, color: '#3b82f6' },
  { label: '×3', mult: 3, color: '#8b5cf6' },
  { label: '×1', mult: 1, color: '#4b5563' },
  { label: '×5', mult: 5, color: '#f59e0b' },
  { label: '×2', mult: 2, color: '#3b82f6' },
  { label: '💀', mult: 0, color: '#ef4444' },
  { label: '×3', mult: 3, color: '#8b5cf6' },
  { label: '×10', mult: 10, color: '#ec4899' },
  { label: '×1', mult: 1, color: '#4b5563' },
  { label: '×2', mult: 2, color: '#3b82f6' },
  { label: '×5', mult: 5, color: '#f59e0b' },
  { label: '×20', mult: 20, color: '#dc2626' },
];

export default function BigRouletteGame({ roundData, round, timeLeft, onSubmit }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ label: string; mult: number; score: number } | null>(null);

  const segments = DEFAULT_SEGMENTS;
  const targetIdx = (roundData?.targetSegmentIdx as number) ?? 0;
  const baseCoins = (roundData?.baseCoins as number) ?? 100;

  useEffect(() => {
    setSpinning(false);
    setSubmitted(false);
    setResult(null);
    setRotation(0);
  }, [round]);

  const conicGradient = useMemo(() => {
    const count = segments.length;
    const deg = 360 / count;
    const parts = segments.map((seg, i) => `${seg.color} ${i * deg}deg ${(i + 1) * deg}deg`);
    return `conic-gradient(${parts.join(', ')})`;
  }, [segments]);

  const handleSpin = () => {
    if (spinning || submitted) return;
    setSpinning(true);

    const count = segments.length;
    const degPerSeg = 360 / count;
    const targetDeg = 360 - (targetIdx * degPerSeg + degPerSeg / 2);
    const spins = 5 + Math.floor(Math.random() * 3);
    const finalRotation = spins * 360 + targetDeg;
    setRotation(finalRotation);

    setTimeout(() => {
      setSpinning(false);
      setSubmitted(true);
      const seg = segments[targetIdx];
      const sc = seg.mult * baseCoins;
      setResult({ label: seg.label, mult: seg.mult, score: sc });
      onSubmit(sc, { segment: seg.label, mult: seg.mult });
    }, 3500);
  };

  useEffect(() => {
    if (timeLeft <= 0 && !submitted && !spinning) {
      setSubmitted(true);
      onSubmit(0);
    }
  }, [timeLeft, submitted, spinning, onSubmit]);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-white/30 text-xs">
        스핀해서 배율을 결정하세요! 이번 라운드 베팅: <span className="text-neon-amber font-bold">{baseCoins}코인</span>
      </p>
      <div className="text-neon-magenta text-2xl">▼</div>
      <div className="relative w-64 h-64">
        <div
          className="w-full h-full rounded-full border-4 border-white/10 overflow-hidden transition-transform ease-[cubic-bezier(0.17,0.67,0.12,0.99)]"
          style={{
            background: conicGradient,
            transform: `rotate(${rotation}deg)`,
            transitionDuration: spinning ? '3.5s' : '0s',
          }}
        >
          {segments.map((seg, i) => {
            const deg = (360 / segments.length) * i + (360 / segments.length) / 2;
            return (
              <div key={i} className="absolute inset-0 flex items-center justify-center"
                style={{ transform: `rotate(${deg}deg)` }}>
                <span className="text-white font-bold text-xs drop-shadow-lg"
                  style={{ transform: `translateY(-90px) rotate(-${deg}deg)` }}>
                  {seg.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#0A0A12] border-2 border-white/10" />
        </div>
      </div>

      {!submitted && !spinning && (
        <button onClick={handleSpin}
          className="px-8 py-3 rounded-xl bg-neon-magenta/15 border border-neon-magenta/25 text-neon-magenta font-bold text-lg hover:bg-neon-magenta/25 active:scale-95 transition-all neon-glow-magenta">
          🎰 SPIN!
        </button>
      )}

      {spinning && <p className="text-neon-cyan animate-pulse font-bold">돌리는 중...</p>}

      {result && (
        <div className="text-center space-y-1">
          <p className="text-2xl font-black text-white">{result.label}</p>
          <p className="text-neon-amber font-bold">+{result.score}점</p>
        </div>
      )}
    </div>
  );
}
