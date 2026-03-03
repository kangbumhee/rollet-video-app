'use client';

import { useState } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

interface Props { onResult: (msg: string) => void; }

function initChests(): Array<{ value: number; opened: boolean }> {
  const vals = [30, 20, 15, 10, -50];
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vals[i], vals[j]] = [vals[j], vals[i]];
  }
  return vals.map((v) => ({ value: v, opened: false }));
}

export default function PirateGold({ onResult }: Props) {
  const [chests, setChests] = useState(initChests);
  const [picks, setPicks] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [exploded, setExploded] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const TOTAL_ROUNDS = 3;
  const MAX_PICKS = 3;

  const openChest = (idx: number) => {
    if (chests[idx]?.opened || picks >= MAX_PICKS || exploded) return;
    soundManager.play('click');
    const updated = chests.map((c, i) => (i === idx ? { ...c, opened: true } : c));
    setChests(updated);
    setPicks((p) => p + 1);
    const val = chests[idx].value;
    if (val < 0) {
      setExploded(true);
      soundManager.play('wrong');
      setScore(0);
    } else {
      setScore((s) => s + val);
      soundManager.play('coin-flip');
    }
  };

  const nextRound = () => {
    const earned = exploded ? 0 : score;
    const newTotal = totalScore + earned;
    setTotalScore(newTotal);
    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
      onResult(newTotal + '점');
      return;
    }
    setRound((r) => r + 1);
    setChests(initChests());
    setPicks(0);
    setScore(0);
    setExploded(false);
  };

  if (gameOver) {
    return (
      <div className="text-center p-4">
        <div className="text-5xl mb-3">🏴‍☠️</div>
        <p className="text-yellow-400 text-2xl font-bold">{totalScore}점</p>
        <button onClick={() => { setGameOver(false); setRound(1); setTotalScore(0); setChests(initChests()); setPicks(0); setScore(0); setExploded(false); }} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold">다시하기</button>
      </div>
    );
  }

  const done = picks >= MAX_PICKS || exploded;

  return (
    <div className="text-center p-4">
      <p className="text-gray-400 text-xs mb-2">라운드 {round}/{TOTAL_ROUNDS} | 총점: {totalScore} | 이번: {exploded ? '폭발!' : score + '점'}</p>
      <p className="text-white font-bold mb-3">
        {done ? (exploded ? '폭탄! 이번 라운드 0점...' : score + '점 획득!') : '상자를 ' + (MAX_PICKS - picks) + '개 더 열 수 있어요!'}
      </p>
      <div className="flex justify-center gap-3 mb-4">
        {chests.map((c, i) => (
          <button key={i} onClick={() => openChest(i)} disabled={c.opened || done} className={'w-14 h-14 rounded-xl text-2xl border-2 transition ' + (c.opened ? (c.value < 0 ? 'bg-red-500/20 border-red-500' : 'bg-yellow-500/20 border-yellow-500') : 'bg-gray-700 border-gray-500 hover:border-yellow-500 hover:scale-105')}>
            {c.opened ? (c.value < 0 ? '💣' : c.value) : '📦'}
          </button>
        ))}
      </div>
      {done && (
        <button onClick={nextRound} className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold">
          {round >= TOTAL_ROUNDS ? '결과 보기' : '다음'}
        </button>
      )}
    </div>
  );
}
