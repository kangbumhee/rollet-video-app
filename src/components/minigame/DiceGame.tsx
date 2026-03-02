'use client';

import { useState } from 'react';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function DiceGame() {
  const [myDice, setMyDice] = useState<number | null>(null);
  const [botDice, setBotDice] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [score, setScore] = useState({ wins: 0, losses: 0, draws: 0 });

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setMyDice(null);
    setBotDice(null);

    setTimeout(() => {
      const my = Math.floor(Math.random() * 6) + 1;
      const bot = Math.floor(Math.random() * 6) + 1;
      setMyDice(my);
      setBotDice(bot);
      setRolling(false);

      if (my > bot) setScore((p) => ({ ...p, wins: p.wins + 1 }));
      else if (my < bot) setScore((p) => ({ ...p, losses: p.losses + 1 }));
      else setScore((p) => ({ ...p, draws: p.draws + 1 }));
    }, 800);
  };

  const getResult = () => {
    if (!myDice || !botDice) return null;
    if (myDice > botDice) return { text: '승리! 🎉', color: 'text-green-400' };
    if (myDice < botDice) return { text: '패배 😢', color: 'text-red-400' };
    return { text: '무승부 🤝', color: 'text-yellow-400' };
  };

  const result = getResult();

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 text-center">
      <p className="text-sm text-gray-400 mb-4">주사위 대결 🎲</p>

      <div className="flex items-center justify-center gap-8 my-6">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">나</p>
          <span className={`text-5xl ${rolling ? 'animate-bounce' : ''}`}>
            {rolling ? '🎲' : myDice ? DICE_FACES[myDice - 1] : '🎲'}
          </span>
          {myDice && <p className="text-sm text-white mt-1 font-bold">{myDice}</p>}
        </div>
        <span className="text-gray-600 text-lg">VS</span>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">상대</p>
          <span className={`text-5xl ${rolling ? 'animate-bounce' : ''}`}>
            {rolling ? '🎲' : botDice ? DICE_FACES[botDice - 1] : '🎲'}
          </span>
          {botDice && <p className="text-sm text-white mt-1 font-bold">{botDice}</p>}
        </div>
      </div>

      {result && <p className={`text-lg font-bold mb-4 ${result.color}`}>{result.text}</p>}

      <button
        onClick={roll}
        disabled={rolling}
        className="px-8 py-2.5 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-xl
                   hover:bg-blue-500/30 active:scale-95 disabled:opacity-50 transition-all text-sm font-medium"
      >
        {rolling ? '굴리는 중...' : '🎲 주사위 굴리기'}
      </button>

      <p className="text-xs text-gray-500 mt-3">
        {score.wins}승 {score.losses}패 {score.draws}무
      </p>
    </div>
  );
}
