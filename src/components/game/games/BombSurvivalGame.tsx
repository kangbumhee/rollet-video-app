'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  roundData: Record<string, unknown>;
  round: number;
  myUid: string;
  timeLeft: number;
  onSubmit: (score: number, extra?: Record<string, unknown>) => Promise<void>;
}

export default function BombSurvivalGame({ roundData, round, timeLeft, onSubmit }: Props) {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [exploded, setExploded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const question = (roundData?.question as string) || '1+1=?';
  const answer = (roundData?.answer as string) || '2';
  const acceptable = (roundData?.acceptable as string[]) || [answer];
  const maxAttempts = 3;
  const bombTimeLimit = (roundData?.timeLimit as number) || 12;

  useEffect(() => {
    setInput('');
    setSubmitted(false);
    setAttempts(0);
    setWrong(false);
    setExploded(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [round]);

  const handleGuess = () => {
    if (submitted || !input.trim()) return;
    const guess = input.trim().toLowerCase();
    const isCorrect = acceptable.some((a: string) => a.toLowerCase() === guess) || guess === String(answer).toLowerCase();

    if (isCorrect) {
      setSubmitted(true);
      const score = Math.max(10, timeLeft * 15);
      onSubmit(score, { attempts: attempts + 1, correct: true });
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setWrong(true);
      setTimeout(() => setWrong(false), 500);
      setInput('');

      if (newAttempts >= maxAttempts) {
        setSubmitted(true);
        setExploded(true);
        onSubmit(0, { attempts: newAttempts, correct: false });
      }
    }
  };

  useEffect(() => {
    if (timeLeft <= 0 && !submitted) {
      setSubmitted(true);
      setExploded(true);
      onSubmit(0, { attempts, correct: false, timedOut: true });
    }
  }, [timeLeft, submitted, attempts, onSubmit]);

  const timerPct = Math.max(0, (timeLeft / bombTimeLimit) * 100);

  return (
    <div className="max-w-sm mx-auto space-y-6 text-center">
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="60" cy="60" r="54" fill="none"
            stroke={timerPct < 30 ? '#ef4444' : '#e879f9'}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 54}`}
            strokeDashoffset={`${2 * Math.PI * 54 * (1 - timerPct / 100)}`}
            className="transition-all duration-200" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-5xl ${exploded ? 'animate-ping' : timeLeft <= 3 ? 'animate-bounce' : ''}`}>
            {exploded ? '💥' : '💣'}
          </span>
        </div>
      </div>
      <div className="bg-surface-base rounded-xl p-4 border border-white/[0.06]">
        <p className="text-white font-bold text-lg">{question}</p>
      </div>
      <div className="flex justify-center gap-1">
        {Array.from({ length: maxAttempts }).map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full ${i < attempts ? 'bg-red-500' : 'bg-white/10'}`} />
        ))}
      </div>
      {!submitted ? (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="정답 입력..."
            className={`flex-1 px-4 py-3 rounded-xl bg-surface-elevated text-white border outline-none transition-all ${
              wrong ? 'border-red-500 animate-shake' : 'border-white/[0.06] focus:border-neon-cyan/40'
            }`}
            onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
          />
          <button onClick={handleGuess}
            className="px-5 py-3 rounded-xl bg-neon-cyan/15 border border-neon-cyan/25 text-neon-cyan font-bold hover:bg-neon-cyan/25 active:scale-95 transition-all">
            확인
          </button>
        </div>
      ) : exploded ? (
        <p className="text-red-500 font-bold text-lg">💥 폭발! 0점</p>
      ) : (
        <p className="text-neon-cyan font-bold text-lg">폭탄 해제 성공! 🎉</p>
      )}
    </div>
  );
}
