'use client';

import { useEffect, useState } from 'react';

interface Props {
  round: number;
  totalRounds: number;
  phase: string;
  scores: Record<string, number>;
  myUid: string;
  myRoundScore: number;
}

export default function RoundTransition({ round, totalRounds, phase, scores, myUid, myRoundScore }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (phase === 'round_result') {
      setShow(true);
      const t = setTimeout(() => setShow(false), 2400);
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [phase, round]);

  if (!show) return null;

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const myRank = sorted.findIndex(([uid]) => uid === myUid) + 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A12]/90 backdrop-blur-sm">
      <div className="text-center space-y-3 animate-in zoom-in-95 duration-500">
        <div className="text-white/20 text-xs font-bold uppercase tracking-[0.2em]">
          ROUND {round} COMPLETE
        </div>
        <div className="text-5xl font-black text-white font-score">
          +{myRoundScore}
        </div>
        <div className={`text-xl font-bold ${myRank <= 3 ? 'text-neon-amber' : 'text-white/60'}`}>
          {myRank === 1 ? '👑 ' : ''}현재 {myRank}위
        </div>
        {round < totalRounds && (
          <div className="text-white/20 text-xs animate-pulse mt-2">
            Round {round + 1} 준비 중...
          </div>
        )}
      </div>
    </div>
  );
}
