'use client';

import { useState, useRef, useCallback } from 'react';

type Phase = 'ready' | 'waiting' | 'click' | 'result' | 'tooearly';

export default function ReactionTest() {
  const [phase, setPhase] = useState<Phase>('ready');
  const [reactionTime, setReactionTime] = useState(0);
  const [bestTime, setBestTime] = useState(Infinity);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const start = () => {
    setPhase('waiting');
    const delay = 1000 + Math.random() * 4000;
    timerRef.current = setTimeout(() => {
      startRef.current = Date.now();
      setPhase('click');
    }, delay);
  };

  const handleClick = useCallback(() => {
    if (phase === 'waiting') {
      clearTimeout(timerRef.current);
      setPhase('tooearly');
    } else if (phase === 'click') {
      const time = Date.now() - startRef.current;
      setReactionTime(time);
      if (time < bestTime) setBestTime(time);
      setPhase('result');
    }
  }, [phase, bestTime]);

  const getGrade = (ms: number) => {
    if (ms < 200) return { text: '번개급! ⚡', color: 'text-yellow-400' };
    if (ms < 300) return { text: '빠르다! 🔥', color: 'text-green-400' };
    if (ms < 500) return { text: '평균 👍', color: 'text-blue-400' };
    return { text: '느림보 🐢', color: 'text-gray-400' };
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 text-center">
      <p className="text-sm text-gray-400 mb-4">반응속도 테스트 ⚡</p>

      {phase === 'ready' && (
        <button
          onClick={start}
          className="w-full py-12 bg-blue-500/20 border border-blue-500/50 rounded-xl text-blue-400 hover:bg-blue-500/30 transition-all"
        >
          <p className="text-lg font-bold">시작하기</p>
          <p className="text-xs mt-1">초록색이 되면 클릭!</p>
        </button>
      )}

      {phase === 'waiting' && (
        <button onClick={handleClick} className="w-full py-12 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400">
          <p className="text-lg font-bold">기다려...</p>
          <p className="text-xs mt-1">아직 누르지 마세요!</p>
        </button>
      )}

      {phase === 'click' && (
        <button
          onClick={handleClick}
          className="w-full py-12 bg-green-500/30 border border-green-500/50 rounded-xl text-green-400 animate-pulse"
        >
          <p className="text-2xl font-bold">지금 클릭!</p>
        </button>
      )}

      {phase === 'tooearly' && (
        <div>
          <div className="py-8 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
            <p className="text-red-400 text-lg font-bold">너무 빨리 눌렀어요! 😅</p>
          </div>
          <button onClick={() => setPhase('ready')} className="text-xs text-gray-400 hover:text-white">
            다시 시도
          </button>
        </div>
      )}

      {phase === 'result' && (
        <div>
          <div className="py-8 bg-gray-900/50 border border-gray-600 rounded-xl mb-4">
            <p className={`text-3xl font-bold ${getGrade(reactionTime).color}`}>{reactionTime}ms</p>
            <p className={`text-sm mt-1 ${getGrade(reactionTime).color}`}>{getGrade(reactionTime).text}</p>
          </div>
          {bestTime < Infinity && <p className="text-xs text-gray-500 mb-3">최고 기록: {bestTime}ms</p>}
          <button onClick={() => setPhase('ready')} className="text-xs text-blue-400 hover:text-blue-300">
            다시 도전
          </button>
        </div>
      )}
    </div>
  );
}
