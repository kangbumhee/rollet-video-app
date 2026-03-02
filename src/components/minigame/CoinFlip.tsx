'use client';

import { useState } from 'react';

interface Props {
  onResult?: (msg: string) => void;
}

export default function CoinFlip({ onResult }: Props) {
  const [phase, setPhase] = useState<'ready' | 'choosing' | 'flipping' | 'result' | 'gameover'>('ready');
  const [streak, setStreak] = useState(0);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [flipAnim, setFlipAnim] = useState(false);

  const startGame = () => {
    setStreak(0);
    setPhase('choosing');
    setCoinResult(null);
  };

  const makeChoice = (pick: 'heads' | 'tails') => {
    setPhase('flipping');
    setFlipAnim(true);

    const result = Math.random() < 0.5 ? 'heads' : 'tails';

    setTimeout(() => {
      setCoinResult(result);
      setFlipAnim(false);
      const correct = pick === result;
      setIsCorrect(correct);

      if (correct) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setPhase('result');
      } else {
        setPhase('gameover');
        onResult?.(`🪙 동전 던지기 ${streak}연속 정답!`);
      }
    }, 1000);
  };

  const continueGame = () => {
    setCoinResult(null);
    setPhase('choosing');
  };

  const stopAndSubmit = () => {
    setPhase('gameover');
    onResult?.(`🪙 동전 던지기 ${streak}연속 정답 달성!`);
  };

  const label = (r: 'heads' | 'tails' | null) => (r === 'heads' ? '앞면' : '뒷면');

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">🪙 동전 던지기 — 연속 정답 도전!</h3>
      <p className="text-gray-400 text-xs text-center">앞/뒤를 맞추세요. 틀리면 즉시 끝!</p>

      {phase !== 'ready' && (
        <div className="text-center">
          <div className="text-5xl font-black text-white">{streak}</div>
          <div className="text-purple-400 text-sm font-bold">연속 정답</div>
        </div>
      )}

      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold border-4 transition-all duration-300 ${
          flipAnim
            ? 'animate-spin border-yellow-400 bg-yellow-400/20'
            : phase === 'gameover' && !isCorrect
              ? 'border-red-500 bg-red-500/20'
              : coinResult
                ? 'border-green-500 bg-green-500/20'
                : 'border-gray-600 bg-gray-700'
        }`}
      >
        {flipAnim ? '🪙' : coinResult === 'heads' ? '😀' : coinResult === 'tails' ? '🌙' : '🪙'}
      </div>

      {phase === 'result' && <div className="text-green-400 font-bold text-lg animate-bounce">✅ {label(coinResult)}! 정답! {streak}연속!</div>}

      {phase === 'gameover' && (
        <div className="text-center">
          <div className="text-red-400 font-bold text-lg mb-1">
            💥 {label(coinResult)}! {streak === 0 ? '아쉽게 틀렸습니다!' : `${streak}연속에서 탈락!`}
          </div>
          <div className="text-white text-2xl font-black">최종 기록: {streak}연속</div>
        </div>
      )}

      {phase === 'ready' && (
        <button
          onClick={startGame}
          className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-lg transition"
        >
          🪙 도전 시작!
        </button>
      )}

      {phase === 'choosing' && (
        <div className="flex flex-col items-center gap-3">
          <div className="text-white text-sm font-bold">{streak === 0 ? '앞? 뒤? 골라보세요!' : `${streak}연속 중! 계속 도전?`}</div>
          <div className="flex gap-4">
            <button
              onClick={() => makeChoice('heads')}
              className="w-24 h-24 bg-gray-700 hover:bg-blue-600/30 border-2 border-gray-600 hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center gap-1 transition"
            >
              <span className="text-3xl">😀</span>
              <span className="text-white text-sm font-bold">앞면</span>
            </button>
            <button
              onClick={() => makeChoice('tails')}
              className="w-24 h-24 bg-gray-700 hover:bg-purple-600/30 border-2 border-gray-600 hover:border-purple-500 rounded-2xl flex flex-col items-center justify-center gap-1 transition"
            >
              <span className="text-3xl">🌙</span>
              <span className="text-white text-sm font-bold">뒷면</span>
            </button>
          </div>
          {streak > 0 && (
            <button
              onClick={stopAndSubmit}
              className="px-4 py-2 bg-red-600/30 border border-red-500 text-red-400 rounded-lg text-sm hover:bg-red-600/50 transition"
            >
              🛑 여기서 멈추기 ({streak}연속 기록 제출)
            </button>
          )}
        </div>
      )}

      {phase === 'result' && (
        <button
          onClick={continueGame}
          className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-lg transition animate-pulse"
        >
          🔥 계속 도전! ({streak + 1}연속 가자!)
        </button>
      )}

      {phase === 'gameover' && (
        <button
          onClick={startGame}
          className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-lg transition"
        >
          🔄 다시 도전!
        </button>
      )}
    </div>
  );
}
