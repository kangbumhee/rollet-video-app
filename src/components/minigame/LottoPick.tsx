'use client';

import { useState } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

interface Props { onResult: (msg: string) => void; }

const POOL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function LottoPick({ onResult }: Props) {
  const [myNums, setMyNums] = useState<number[]>([]);
  const [winNums, setWinNums] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const TOTAL_ROUNDS = 3;

  const pickNumber = (n: number) => {
    if (myNums.includes(n) || myNums.length >= 3) return;
    soundManager.play('click');
    setMyNums((p) => [...p, n]);
  };

  const reveal = () => {
    soundManager.play('dice-roll');
    const winning = new Set<number>();
    while (winning.size < 3) winning.add(POOL[Math.floor(Math.random() * POOL.length)]);
    const winArr = Array.from(winning);
    setWinNums(winArr);
    setRevealed(true);
    const matches = myNums.filter((n) => winArr.includes(n)).length;
    const pts = matches === 3 ? 100 : matches === 2 ? 30 : matches === 1 ? 10 : 0;
    setTotalScore((p) => p + pts);
    if (matches >= 2) soundManager.play('cash-register');
    else if (matches === 0) soundManager.play('wrong');
  };

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) { setGameOver(true); onResult(totalScore + '점'); return; }
    setRound((r) => r + 1);
    setMyNums([]);
    setWinNums([]);
    setRevealed(false);
  };

  if (gameOver) {
    return (
      <div className="text-center p-4">
        <div className="text-5xl mb-3">🎫</div>
        <p className="text-yellow-400 text-2xl font-bold">{totalScore}점</p>
        <button onClick={() => { setGameOver(false); setRound(1); setTotalScore(0); setMyNums([]); setWinNums([]); setRevealed(false); }} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold">다시하기</button>
      </div>
    );
  }

  const matches = myNums.filter((n) => winNums.includes(n)).length;

  return (
    <div className="text-center p-4">
      <p className="text-gray-400 text-xs mb-2">라운드 {round}/{TOTAL_ROUNDS} | 총점: {totalScore}</p>
      <p className="text-white font-bold mb-3">번호 3개를 선택하세요!</p>
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {POOL.map((n) => (
          <button key={n} onClick={() => pickNumber(n)} disabled={revealed} className={'w-10 h-10 rounded-full text-sm font-bold border-2 transition ' + (myNums.includes(n) ? (revealed ? (winNums.includes(n) ? 'bg-green-500 border-green-400 text-white' : 'bg-red-500/30 border-red-500 text-white') : 'bg-blue-500 border-blue-400 text-white') : (revealed && winNums.includes(n) ? 'bg-yellow-500/30 border-yellow-500 text-yellow-400' : 'bg-gray-700 border-gray-500 text-gray-300 hover:border-blue-500'))}>
            {n}
          </button>
        ))}
      </div>
      {myNums.length > 0 && <p className="text-blue-400 text-sm mb-2">내 번호: {myNums.join(', ')}</p>}
      {revealed ? (
        <div>
          <p className="text-yellow-400 text-sm mb-1">당첨: {winNums.join(', ')}</p>
          <p className={'text-lg font-bold ' + (matches >= 2 ? 'text-green-400' : matches === 1 ? 'text-yellow-400' : 'text-red-400')}>
            {matches === 3 ? '올 맞춤! +100점' : matches === 2 ? '2개 맞춤! +30점' : matches === 1 ? '1개 맞춤! +10점' : '꽝!'}
          </p>
          <button onClick={nextRound} className="mt-3 px-6 py-2 bg-green-600 text-white rounded-xl font-bold">{round >= TOTAL_ROUNDS ? '결과 보기' : '다음'}</button>
        </div>
      ) : myNums.length === 3 ? (
        <button onClick={reveal} className="px-8 py-3 bg-yellow-500 text-black rounded-xl font-bold text-lg">추첨!</button>
      ) : null}
    </div>
  );
}
