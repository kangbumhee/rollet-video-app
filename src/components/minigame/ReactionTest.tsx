'use client';

import { useState, useRef } from 'react';

type Phase = 'ready' | 'waiting' | 'click' | 'result' | 'tooearly';

interface Props {
  onResult?: (msg: string) => void;
}

export default function ReactionTest({ onResult }: Props) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [ms, setMs] = useState(0);
  const [best, setBest] = useState(9999);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    setPhase('waiting');
    const delay = 1000 + Math.random() * 4000;
    timerRef.current = setTimeout(() => {
      startRef.current = Date.now();
      setPhase('click');
    }, delay);
  };

  const handleClick = () => {
    if (phase === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase('tooearly');
      return;
    }
    if (phase === 'click') {
      const elapsed = Date.now() - startRef.current;
      setMs(elapsed);
      const nb = Math.min(best, elapsed);
      setBest(nb);
      setPhase('result');
      onResult?.(`⚡ 반응속도 ${elapsed}ms! (최고: ${nb}ms)`);
    }
  };

  const bg =
    phase === 'waiting'
      ? 'bg-red-600'
      : phase === 'click'
        ? 'bg-green-500'
        : phase === 'tooearly'
          ? 'bg-orange-500'
          : 'bg-gray-700';

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">⚡ 반응속도 테스트</h3>
      <button
        onClick={phase === 'ready' || phase === 'result' || phase === 'tooearly' ? start : handleClick}
        className={`w-full h-40 rounded-xl text-white font-bold text-xl transition-colors ${bg}`}
      >
        {phase === 'ready' && '클릭하여 시작'}
        {phase === 'waiting' && '초록색이 되면 클릭!'}
        {phase === 'click' && '지금 클릭!'}
        {phase === 'result' && `${ms}ms! 클릭하여 재시도`}
        {phase === 'tooearly' && '너무 빨리 눌렀어요! 클릭하여 재시도'}
      </button>
      {best < 9999 && <p className="text-yellow-400 text-sm">최고 기록: {best}ms</p>}
    </div>
  );
}
