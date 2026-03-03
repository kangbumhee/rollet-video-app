'use client';

import { useState } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

interface Props { onResult: (msg: string) => void; }

const COLORS = ['🔴', '🔵', '🟢', '🟡', '🟣'];
const COLOR_NAMES = ['빨강', '파랑', '초록', '노랑', '보라'];

export default function CrystalBall({ onResult }: Props) {
  const [prediction, setPrediction] = useState<number | null>(null);
  const [actual, setActual] = useState<number | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [round, setRound] = useState(1);
  const [streak, setStreak] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const TOTAL_ROUNDS = 7;

  const predict = (idx: number) => {
    soundManager.play('click');
    setPrediction(idx);
    setRevealing(true);
    setTimeout(() => {
      const result = Math.floor(Math.random() * COLORS.length);
      setActual(result);
      setRevealing(false);
      const correct = result === idx;
      const pts = correct ? 20 + streak * 10 : 0;
      setTotalScore((prev) => prev + pts);
      setStreak((s) => (correct ? s + 1 : 0));
      if (correct) soundManager.play('cash-register');
      else soundManager.play('wrong');
    }, 1200);
  };

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
      onResult(`${totalScore}점`);
      return;
    }
    setRound((r) => r + 1);
    setPrediction(null);
    setActual(null);
  };

  if (gameOver) {
    return (
      <div className="text-center p-4">
        <div className="text-5xl mb-3">🔮</div>
        <p className="text-yellow-400 text-2xl font-bold">{totalScore}점</p>
        <button onClick={() => { setGameOver(false); setRound(1); setTotalScore(0); setStreak(0); setPrediction(null); setActual(null); }} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold">다시하기</button>
      </div>
    );
  }

  return (
    <div className="text-center p-4">
      <p className="text-gray-400 text-xs mb-2">라운드 {round}/{TOTAL_ROUNDS} | 총점: {totalScore} | 연속: {streak}</p>
      <div className="text-6xl mb-4">
        {revealing ? <span className="animate-spin inline-block">🔮</span> : actual !== null ? COLORS[actual] : '🔮'}
      </div>
      {actual !== null ? (
        <div>
          <p className={actual === prediction ? 'text-green-400 text-lg font-bold' : 'text-red-400 text-lg font-bold'}>
            {actual === prediction ? `✨ 적중! +${20 + (streak - 1) * 10}점` : `💫 빗나감 (정답: ${COLOR_NAMES[actual]})`}
          </p>
          <button onClick={nextRound} className="mt-3 px-6 py-2 bg-green-600 text-white rounded-xl font-bold">
            {round >= TOTAL_ROUNDS ? '결과 보기' : '다음 →'}
          </button>
        </div>
      ) : !revealing ? (
        <div>
          <p className="text-white font-bold mb-3">수정구슬의 색을 예측하세요!</p>
          <div className="flex justify-center gap-3">
            {COLORS.map((c, i) => (
              <button key={i} onClick={() => predict(i)} className="w-12 h-12 rounded-full text-2xl border-2 border-gray-500 hover:border-yellow-500 hover:scale-110 transition bg-gray-800">
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-purple-400 animate-pulse">수정구슬을 들여다보는 중...</p>
      )}
    </div>
  );
}
