'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  roundData: Record<string, unknown>;
  round: number;
  myUid: string;
  timeLeft: number;
  onSubmit: (score: number, extra?: Record<string, unknown>) => Promise<void>;
}

export default function TypingRaceGame({ roundData, round, timeLeft, onSubmit }: Props) {
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);

  const rawSentence = (roundData?.sentence as string) || '타이핑 테스트';
  const sentence = rawSentence.normalize('NFC').replace(/\s+/g, ' ').trim();

  useEffect(() => {
    setInput('');
    setStartTime(null);
    setSubmitted(false);
    submittedRef.current = false;
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [round]);

  const calcAccuracy = useCallback(() => {
    if (!input.length) return 0;
    let correct = 0;
    const normalizedInput = input.normalize('NFC');
    const normalizedSentence = sentence;
    for (let i = 0; i < Math.min(normalizedInput.length, normalizedSentence.length); i++) {
      if (normalizedInput[i] === normalizedSentence[i]) correct++;
    }
    return Math.round((correct / normalizedSentence.length) * 100);
  }, [input, sentence]);

  useEffect(() => {
    if (submitted || submittedRef.current) return;
    const normalizedInput = input.normalize('NFC');
    if (normalizedInput === sentence && normalizedInput.length > 0) {
      submittedRef.current = true;
      setSubmitted(true);
      const elapsed = startTime ? (Date.now() - startTime) / 1000 : 30;
      const acc = 100;
      const timeLimit = (roundData?.timeLimit as number) || 20;
      const speedBonus = Math.max(0, timeLimit - elapsed);
      const score = Math.round(acc * (1 + speedBonus / timeLimit));
      onSubmit(score, { accuracy: acc, elapsed: Math.round(elapsed * 10) / 10 });
    }
  }, [input, sentence, startTime, submitted, onSubmit, roundData?.timeLimit]);

  useEffect(() => {
    if (timeLeft <= 0 && !submittedRef.current) {
      submittedRef.current = true;
      setSubmitted(true);
      const acc = calcAccuracy();
      const score = Math.round(acc * 0.5);
      onSubmit(score, { accuracy: acc, timedOut: true });
    }
  }, [timeLeft, calcAccuracy, onSubmit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (submitted) return;
    const val = e.target.value;
    if (!startTime && val.length === 1) setStartTime(Date.now());
    setInput(val);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <p className="text-center text-white/30 text-sm">아래 문장을 빠르게 정확히 입력하세요!</p>

      <div className="bg-surface-base rounded-xl p-5 border border-white/[0.06] min-h-[70px]">
        <div className="flex flex-wrap items-center leading-relaxed">
          {sentence.split('').map((char: string, i: number) => {
            const normalizedInput = input.normalize('NFC');
            let cls = 'text-white/30';
            if (i < normalizedInput.length) {
              cls = normalizedInput[i] === char ? 'text-neon-cyan' : 'text-red-500 underline decoration-red-500';
            }
            if (i === normalizedInput.length) cls = 'text-white bg-neon-cyan/20 rounded-sm';

            if (char === ' ') {
              return (
                <span
                  key={i}
                  className={`inline-block w-3 h-6 mx-[1px] rounded-sm ${
                    i < normalizedInput.length
                      ? normalizedInput[i] === ' ' ? 'bg-neon-cyan/10' : 'bg-red-500/20'
                      : i === normalizedInput.length ? 'bg-neon-cyan/30' : 'bg-white/5'
                  }`}
                >
                  &nbsp;
                </span>
              );
            }

            return (
              <span key={i} className={`text-lg font-mono ${cls} transition-colors`}>
                {char}
              </span>
            );
          })}
        </div>
      </div>

      <input
        ref={inputRef}
        value={input}
        onChange={handleChange}
        disabled={submitted}
        placeholder="여기에 입력..."
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="w-full px-5 py-4 rounded-xl bg-surface-elevated text-white text-lg font-mono border-2 border-white/[0.06] focus:border-neon-cyan/40 outline-none transition-all disabled:opacity-50"
      />
      <div className="flex justify-between text-xs text-white/30">
        <span>정확도: <span className="text-white font-bold font-score">{calcAccuracy()}%</span></span>
        <span>진행: <span className="text-white font-bold font-score">{Math.min(input.normalize('NFC').length, sentence.length)}/{sentence.length}</span></span>
      </div>
    </div>
  );
}
