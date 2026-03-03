'use client';

import { useState, useEffect, useRef } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

interface Props { onResult: (msg: string) => void; }

export default function ShootingStar({ onResult }: Props) {
  const [phase, setPhase] = useState<'wait' | 'catch' | 'result'>('wait');
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [caught, setCaught] = useState(false);
  const [starScore, setStarScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const catchWindowRef = useRef<NodeJS.Timeout | null>(null);
  const hasCaughtRef = useRef(false);

  const TOTAL_ROUNDS = 5;

  useEffect(() => {
    hasCaughtRef.current = false;
    setPhase('wait');
    setCaught(false);
    setStarScore(0);
    const delay = 1000 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      setPhase('catch');
      soundManager.play('game-start');
      const windowMs = 600 + Math.random() * 900;
      catchWindowRef.current = setTimeout(() => {
        if (!hasCaughtRef.current) {
          setPhase('result');
          soundManager.play('wrong');
        }
      }, windowMs);
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (catchWindowRef.current) clearTimeout(catchWindowRef.current);
    };
  }, [round]);

  const catchStar = () => {
    if (phase === 'wait') {
      if (timerRef.current) clearTimeout(timerRef.current);
      soundManager.play('wrong');
      setStarScore(0);
      setPhase('result');
      return;
    }
    if (phase !== 'catch') return;
    if (catchWindowRef.current) clearTimeout(catchWindowRef.current);
    hasCaughtRef.current = true;
    setCaught(true);
    const pts = [10, 15, 20, 25, 30, 50][Math.floor(Math.random() * 6)];
    setStarScore(pts);
    setTotalScore((p) => p + pts);
    soundManager.play('cash-register');
    setPhase('result');
  };

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
      onResult(totalScore + '점');
      return;
    }
    setRound((r) => r + 1);
  };

  if (gameOver) {
    return (
      <div className="text-center p-4">
        <div className="text-5xl mb-3">🌠</div>
        <p className="text-yellow-400 text-2xl font-bold">{totalScore}점</p>
        <button onClick={() => { setGameOver(false); setRound(1); setTotalScore(0); setCaught(false); setStarScore(0); }} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold">다시하기</button>
      </div>
    );
  }

  return (
    <div className="text-center p-4">
      <p className="text-gray-400 text-xs mb-2">라운드 {round}/{TOTAL_ROUNDS} | 총점: {totalScore}</p>
      <div onClick={catchStar} className={'w-48 h-48 mx-auto rounded-full flex items-center justify-center text-6xl cursor-pointer transition-all border-4 ' + (phase === 'wait' ? 'bg-gray-900 border-gray-700' : phase === 'catch' ? 'bg-indigo-900 border-yellow-400 animate-pulse scale-110' : 'bg-gray-800 border-gray-600')}>
        {phase === 'wait' && '🌌'}
        {phase === 'catch' && '🌠'}
        {phase === 'result' && (caught ? '⭐' : '🌑')}
      </div>
      <p className="text-white font-bold mt-4">
        {phase === 'wait' && '밤하늘을 바라보세요...'}
        {phase === 'catch' && '지금 잡으세요!'}
        {phase === 'result' && (caught ? '+' + starScore + '점!' : '놓쳤어요...')}
      </p>
      {phase === 'result' && (
        <button onClick={nextRound} className="mt-3 px-6 py-2 bg-green-600 text-white rounded-xl font-bold">
          {round >= TOTAL_ROUNDS ? '결과 보기' : '다음'}
        </button>
      )}
    </div>
  );
}
