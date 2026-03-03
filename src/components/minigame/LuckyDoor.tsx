'use client';

import { useState } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

interface Props { onResult: (msg: string) => void; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function LuckyDoor({ onResult }: Props) {
  const [phase, setPhase] = useState<'pick' | 'reveal' | 'switch' | 'final'>('pick');
  const [doorsState, setDoorsState] = useState(() => shuffle(['💀', '💀', '🎁']));
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [finalPick, setFinalPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const TOTAL_ROUNDS = 5;

  const pickDoor = (idx: number) => {
    if (phase !== 'pick') return;
    soundManager.play('click');
    setPicked(idx);
    const others = [0, 1, 2].filter(i => i !== idx && doorsState[i] === '💀');
    const revealIdx = others[Math.floor(Math.random() * others.length)];
    setRevealed(revealIdx);
    setPhase('switch');
  };

  const decide = (switchDoor: boolean) => {
    soundManager.play('click');
    let final = picked!;
    if (switchDoor) {
      final = [0, 1, 2].find(i => i !== picked && i !== revealed)!;
    }
    setFinalPick(final);
    const won = doorsState[final] === '🎁';
    const pts = won ? (round * 20) : 0;
    setScore(pts);
    setTotalScore(prev => prev + pts);
    if (won) soundManager.play('cash-register');
    else soundManager.play('wrong');
    setPhase('final');
  };

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
      onResult(`${totalScore}점`);
      return;
    }
    setDoorsState(shuffle(['💀', '💀', '🎁']));
    setPicked(null);
    setRevealed(null);
    setFinalPick(null);
    setScore(0);
    setRound(r => r + 1);
    setPhase('pick');
  };

  const reset = () => {
    setGameOver(false);
    setRound(1);
    setTotalScore(0);
    setPhase('pick');
    setDoorsState(shuffle(['💀', '💀', '🎁']));
    setPicked(null);
    setRevealed(null);
    setFinalPick(null);
    setScore(0);
  };

  if (gameOver) {
    return (
      <div className="text-center p-4">
        <div className="text-5xl mb-3">🚪</div>
        <p className="text-white text-lg font-bold">게임 종료!</p>
        <p className="text-yellow-400 text-2xl font-bold mt-2">{totalScore}점</p>
        <button onClick={reset} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold">다시하기</button>
      </div>
    );
  }

  return (
    <div className="text-center p-4">
      <p className="text-gray-400 text-xs mb-2">라운드 {round}/{TOTAL_ROUNDS} | 총점: {totalScore}</p>
      <p className="text-white font-bold mb-4">
        {phase === 'pick' && '🚪 문을 하나 골라주세요!'}
        {phase === 'switch' && `${revealed! + 1}번 문 뒤에는 💀! 바꾸시겠습니까?`}
        {phase === 'final' && (doorsState[finalPick!] === '🎁' ? `🎉 ${score}점 당첨!` : '💀 꽝!')}
      </p>
      <div className="flex justify-center gap-3 mb-4">
        {[0, 1, 2].map(i => (
          <button
            key={i}
            onClick={() => phase === 'pick' && pickDoor(i)}
            disabled={phase === 'final' ? false : phase !== 'pick'}
            className={`w-20 h-24 rounded-xl text-3xl flex items-center justify-center border-2 transition-all ${
              phase === 'final'
                ? doorsState[i] === '🎁'
                  ? 'bg-yellow-500/20 border-yellow-500'
                  : 'bg-red-500/10 border-red-500/30'
                : i === picked
                  ? 'bg-blue-500/20 border-blue-500 scale-105'
                  : i === revealed
                    ? 'bg-gray-800 border-gray-600 opacity-50'
                    : 'bg-gray-700 border-gray-500 hover:border-purple-500'
            }`}
          >
            {phase === 'final' || i === revealed ? doorsState[i] : `${i + 1}`}
          </button>
        ))}
      </div>
      {phase === 'switch' && (
        <div className="flex justify-center gap-3">
          <button onClick={() => decide(false)} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold">유지하기</button>
          <button onClick={() => decide(true)} className="px-5 py-2 bg-orange-500 text-white rounded-lg font-bold">바꾸기!</button>
        </div>
      )}
      {phase === 'final' && (
        <button onClick={nextRound} className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold">
          {round >= TOTAL_ROUNDS ? '결과 보기' : '다음 라운드 →'}
        </button>
      )}
    </div>
  );
}
