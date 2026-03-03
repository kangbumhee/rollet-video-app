'use client';

import { useState, useEffect, useRef } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

interface Props { onResult: (msg: string) => void; }

const ANIMALS = [{ emoji: '🐎', name: '말' }, { emoji: '🐕', name: '강아지' }, { emoji: '🐈', name: '고양이' }, { emoji: '🐇', name: '토끼' }, { emoji: '🐢', name: '거북이' }, { emoji: '🐌', name: '달팽이' }];

export default function AnimalRace({ onResult }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const [racing, setRacing] = useState(false);
  const [positions, setPositions] = useState<number[]>(Array(6).fill(0));
  const [winner, setWinner] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const TOTAL_ROUNDS = 3;

  const startRace = () => {
    if (picked === null) return;
    soundManager.play('game-start');
    setRacing(true);
    setPositions(Array(6).fill(0));
    setWinner(null);
    const pos = Array(6).fill(0);
    intervalRef.current = setInterval(() => {
      let finished = -1;
      for (let i = 0; i < 6; i++) {
        pos[i] += Math.random() * 5 + 1;
        if (pos[i] >= 100 && finished === -1) finished = i;
      }
      setPositions([...pos]);
      if (finished >= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setWinner(finished);
        setRacing(false);
        const pts = finished === picked ? 30 * round : 0;
        setTotalScore((p) => p + pts);
        if (finished === picked) soundManager.play('cash-register');
        else soundManager.play('wrong');
      }
    }, 150);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) { setGameOver(true); onResult(totalScore + '점'); return; }
    setRound((r) => r + 1);
    setPicked(null);
    setPositions(Array(6).fill(0));
    setWinner(null);
  };

  if (gameOver) {
    return (
      <div className="text-center p-4">
        <div className="text-5xl mb-3">🏁</div>
        <p className="text-yellow-400 text-2xl font-bold">{totalScore}점</p>
        <button onClick={() => { setGameOver(false); setRound(1); setTotalScore(0); setPicked(null); setPositions(Array(6).fill(0)); setWinner(null); }} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold">다시하기</button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <p className="text-gray-400 text-xs mb-2 text-center">라운드 {round}/{TOTAL_ROUNDS} | 총점: {totalScore}</p>
      {!racing && winner === null && (
        <div className="text-center mb-3">
          <p className="text-white font-bold mb-2">1등 동물을 골라주세요!</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {ANIMALS.map((a, i) => (
              <button key={i} onClick={() => { soundManager.play('click'); setPicked(i); }} className={'p-2 rounded-lg border-2 transition ' + (picked === i ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-600 bg-gray-800 hover:border-purple-500')}>
                <span className="text-xl">{a.emoji}</span>
                <p className="text-white text-[10px]">{a.name}</p>
              </button>
            ))}
          </div>
          <button onClick={startRace} disabled={picked === null} className="px-8 py-2 bg-green-600 text-white rounded-xl font-bold disabled:opacity-40">출발!</button>
        </div>
      )}
      <div className="space-y-1">
        {ANIMALS.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm w-6">{a.emoji}</span>
            <div className="flex-1 h-5 bg-gray-700 rounded-full overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-150" style={{ width: Math.min(100, positions[i]) + '%' }} />
            </div>
            {winner === i && <span className="text-yellow-400 text-xs font-bold">1</span>}
            {picked === i && <span className="text-blue-400 text-xs">*</span>}
          </div>
        ))}
      </div>
      {winner !== null && (
        <div className="text-center mt-3">
          <p className={winner === picked ? 'text-green-400 text-lg font-bold' : 'text-red-400 text-lg font-bold'}>
            {winner === picked ? '적중! +' + (30 * round) + '점' : ANIMALS[winner].emoji + ' 1등!'}
          </p>
          <button onClick={nextRound} className="mt-2 px-6 py-2 bg-green-600 text-white rounded-xl font-bold">{round >= TOTAL_ROUNDS ? '결과 보기' : '다음'}</button>
        </div>
      )}
    </div>
  );
}
