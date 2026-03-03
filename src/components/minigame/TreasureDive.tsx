'use client';

import { useState } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

interface Props { onResult: (msg: string) => void; }

const DEPTHS = [
  { label: '얕은 바다 🏖️', risk: 0, rewards: [10, 15, 20] },
  { label: '깊은 바다 🌊', risk: 25, rewards: [0, 30, 50] },
  { label: '심해 🦑', risk: 50, rewards: [-20, 0, 80, 100] },
];

export default function TreasureDive({ onResult }: Props) {
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [result, setResult] = useState<{ depth: number; reward: number } | null>(null);
  const [diving, setDiving] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const TOTAL_ROUNDS = 5;

  const dive = (depthIdx: number) => {
    soundManager.play('click');
    setDiving(true);
    setTimeout(() => {
      const depth = DEPTHS[depthIdx];
      const reward = depth.rewards[Math.floor(Math.random() * depth.rewards.length)];
      setResult({ depth: depthIdx, reward });
      setTotalScore(prev => prev + reward);
      setDiving(false);
      if (reward > 0) soundManager.play('cash-register');
      else if (reward < 0) soundManager.play('wrong');
      else soundManager.play('click');
    }, 1500);
  };

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
      onResult(`${Math.max(0, totalScore)}점`);
      return;
    }
    setRound(r => r + 1);
    setResult(null);
  };

  if (gameOver) {
    return (
      <div className="text-center p-4">
        <div className="text-5xl mb-3">🤿</div>
        <p className="text-white font-bold">다이빙 완료!</p>
        <p className="text-yellow-400 text-2xl font-bold mt-2">{Math.max(0, totalScore)}점</p>
        <button onClick={() => { setGameOver(false); setRound(1); setTotalScore(0); setResult(null); }} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold">다시하기</button>
      </div>
    );
  }

  return (
    <div className="text-center p-4">
      <p className="text-gray-400 text-xs mb-2">라운드 {round}/{TOTAL_ROUNDS} | 총점: {totalScore}</p>
      {diving ? (
        <div className="py-8">
          <p className="text-4xl animate-bounce">🤿</p>
          <p className="text-blue-400 mt-2 animate-pulse">다이빙 중...</p>
        </div>
      ) : result !== null ? (
        <div className="mb-4">
          <p className="text-white mb-1">{DEPTHS[result.depth].label}</p>
          <p className={`text-2xl font-bold ${result.reward > 0 ? 'text-green-400' : result.reward < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {result.reward > 0 ? `🎁 +${result.reward}점!` : result.reward < 0 ? `🦑 ${result.reward}점` : '🫧 아무것도 없음'}
          </p>
          <button onClick={nextRound} className="mt-3 px-6 py-2 bg-green-600 text-white rounded-xl font-bold">
            {round >= TOTAL_ROUNDS ? '결과 보기' : '다음 →'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-white font-bold mb-2">어디로 다이빙할까요?</p>
          {DEPTHS.map((d, i) => (
            <button key={i} onClick={() => dive(i)}
              className={`px-4 py-3 rounded-xl font-bold text-white border transition ${
                i === 0 ? 'bg-cyan-600/20 border-cyan-500 hover:bg-cyan-600/40' :
                i === 1 ? 'bg-blue-600/20 border-blue-500 hover:bg-blue-600/40' :
                'bg-purple-600/20 border-purple-500 hover:bg-purple-600/40'
              }`}>
              {d.label} <span className="text-xs opacity-70">(위험: {d.risk}%)</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
