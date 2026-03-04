'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  roundData: Record<string, unknown>;
  round: number;
  myUid: string;
  timeLeft: number;
  onSubmit: (score: number, extra?: Record<string, unknown>) => Promise<void>;
}

export default function WeaponForgeGame({ roundData, round, timeLeft, onSubmit }: Props) {
  const [phase, setPhase] = useState<'ready' | 'forging' | 'result'>('ready');
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState(false);
  const [forgeProgress, setForgeProgress] = useState(0);
  const submittedRef = useRef(false);

  const weaponName = (roundData?.weaponName as string) || `+${round} 무기`;
  const baseSuccessRate = (roundData?.baseSuccessRate as number) || 50;

  useEffect(() => {
    setPhase('ready');
    setSubmitted(false);
    setSuccess(false);
    setForgeProgress(0);
    submittedRef.current = false;
  }, [round]);

  const handleForge = () => {
    if (phase !== 'ready' || submitted) return;
    setPhase('forging');

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        const roll = Math.random() * 100;
        const isSuccess = roll < baseSuccessRate;
        setSuccess(isSuccess);
        setPhase('result');

        if (!submittedRef.current) {
          submittedRef.current = true;
          setSubmitted(true);
          const score = isSuccess ? Math.round(100 - baseSuccessRate + 20) : 0;
          onSubmit(score, { success: isSuccess, successRate: baseSuccessRate });
        }
      }
      setForgeProgress(Math.min(100, progress));
    }, 120);
  };

  useEffect(() => {
    if (timeLeft <= 0 && !submittedRef.current) {
      submittedRef.current = true;
      setSubmitted(true);
      onSubmit(0, { success: false, timedOut: true });
    }
  }, [timeLeft, onSubmit]);

  return (
    <div className="max-w-sm mx-auto space-y-6 text-center">
      <div className="text-6xl">{success ? '✨' : phase === 'result' ? '💥' : '⚔️'}</div>
      <h3 className="text-white font-bold text-xl">{weaponName}</h3>
      <div className="bg-surface-base rounded-xl p-4 border border-white/[0.06]">
        <p className="text-white/30 text-xs mb-1">강화 성공률</p>
        <p className={`font-bold text-2xl font-score ${baseSuccessRate > 50 ? 'text-neon-cyan' : baseSuccessRate > 30 ? 'text-neon-amber' : 'text-red-400'}`}>
          {baseSuccessRate}%
        </p>
      </div>

      {phase === 'ready' && (
        <button onClick={handleForge}
          className="w-full py-4 rounded-xl font-bold text-lg bg-neon-magenta/15 border border-neon-magenta/25 text-neon-magenta hover:bg-neon-magenta/25 active:scale-95 transition-all animate-pulse">
          ⚒️ 강화하기!
        </button>
      )}

      {phase === 'forging' && (
        <div className="space-y-3">
          <div className="w-full h-4 bg-surface-elevated rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-neon-magenta to-neon-amber rounded-full transition-all duration-100"
              style={{ width: `${forgeProgress}%` }} />
          </div>
          <p className="text-neon-amber animate-pulse font-bold">강화 중... ⚒️</p>
        </div>
      )}

      {phase === 'result' && (
        <div className={`p-6 rounded-xl border ${success ? 'bg-neon-cyan/10 border-neon-cyan/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <p className="text-3xl mb-2">{success ? '🎉' : '💔'}</p>
          <p className={`font-black text-xl ${success ? 'text-neon-cyan' : 'text-red-400'}`}>
            {success ? '강화 성공!' : '강화 실패...'}
          </p>
          <p className="text-white/30 text-sm mt-1">
            {success ? `+${Math.round(100 - baseSuccessRate + 20)}점` : '0점'}
          </p>
        </div>
      )}
    </div>
  );
}
