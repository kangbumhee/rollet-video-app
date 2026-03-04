'use client';

import { useState, useEffect, useCallback } from 'react';

interface Props {
  roundData: Record<string, unknown>;
  round: number;
  myUid: string;
  timeLeft: number;
  onSubmit: (score: number, extra?: Record<string, unknown>) => Promise<void>;
}

export default function MemoryMatchGame({ roundData, round, timeLeft, onSubmit }: Props) {
  const gridSize = (roundData?.gridSize as number) || 4;
  const cards: string[] = (roundData?.cards as string[]) || [];
  const totalPairs = (gridSize * gridSize) / 2;

  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setFlipped([]);
    setMatched(new Set());
    setSubmitted(false);
    setScore(0);
    setCombo(0);
    setChecking(false);
  }, [round]);

  const handleFlip = useCallback((idx: number) => {
    if (submitted || checking || matched.has(idx) || flipped.includes(idx) || flipped.length >= 2) return;

    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setChecking(true);
      const [a, b] = newFlipped;
      if (cards[a] === cards[b]) {
        const newCombo = combo + 1;
        const bonus = 10 + (newCombo - 1) * 5;
        const newScore = score + bonus;
        setCombo(newCombo);
        setScore(newScore);

        setTimeout(() => {
          setMatched((prev) => {
            const next = new Set(prev);
            next.add(a);
            next.add(b);

            if (next.size >= cards.length) {
              setSubmitted(true);
              const timeBonus = timeLeft * 3;
              onSubmit(newScore + timeBonus, { matches: next.size / 2, timeBonus });
            }

            return next;
          });
          setFlipped([]);
          setChecking(false);
        }, 400);
      } else {
        setCombo(0);
        setTimeout(() => {
          setFlipped([]);
          setChecking(false);
        }, 700);
      }
    }
  }, [flipped, matched, cards, submitted, checking, combo, score, timeLeft, onSubmit]);

  useEffect(() => {
    if (timeLeft <= 0 && !submitted) {
      setSubmitted(true);
      onSubmit(score, { matches: matched.size / 2, timedOut: true });
    }
  }, [timeLeft, submitted, score, matched, onSubmit]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <span className="text-white/30 text-xs">매치: {matched.size / 2}/{totalPairs}</span>
        <span className="text-neon-amber font-bold font-score">{score}점</span>
        {combo > 1 && <span className="text-neon-cyan text-xs font-bold animate-pulse">🔥 ×{combo}</span>}
      </div>
      <div className="grid gap-2" style={{
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        maxWidth: gridSize === 4 ? 280 : 360,
      }}>
        {cards.map((emoji, idx) => {
          const isFlipped = flipped.includes(idx) || matched.has(idx);
          return (
            <button key={idx} onClick={() => handleFlip(idx)}
              className={`aspect-square rounded-lg text-2xl flex items-center justify-center transition-all duration-300 ${
                matched.has(idx)
                  ? 'bg-neon-cyan/20 border border-neon-cyan/30 scale-95'
                  : isFlipped
                    ? 'bg-surface-elevated border border-neon-magenta/30'
                    : 'bg-surface-base border border-white/[0.06] hover:border-white/20 active:scale-95'
              }`}
              style={{ minWidth: gridSize === 4 ? 60 : 48, minHeight: gridSize === 4 ? 60 : 48 }}
              disabled={submitted}>
              {isFlipped ? emoji : '❓'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
