'use client';

import { useState } from 'react';

interface Props {
  onResult?: (msg: string) => void;
}

const DICE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function DiceGame({ onResult }: Props) {
  const [myDice, setMyDice] = useState(0);
  const [botDice, setBotDice] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [record, setRecord] = useState({ w: 0, l: 0, d: 0 });

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setTimeout(() => {
      const m = Math.floor(Math.random() * 6) + 1;
      const b = Math.floor(Math.random() * 6) + 1;
      setMyDice(m);
      setBotDice(b);
      setRolling(false);

      const nr = { ...record };
      let res = '';
      if (m > b) {
        nr.w++;
        res = '승리!';
      } else if (m < b) {
        nr.l++;
        res = '패배!';
      } else {
        nr.d++;
        res = '무승부!';
      }
      setRecord(nr);
      onResult?.(`🎲 주사위 ${m} vs ${b}! ${res} (${nr.w}승 ${nr.l}패 ${nr.d}무)`);
    }, 600);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">🎲 주사위 대결</h3>
      <div className="flex gap-8 text-5xl">
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">나</p>
          <span className={rolling ? 'animate-bounce' : ''}>{DICE[myDice - 1] || '🎲'}</span>
        </div>
        <span className="text-white self-center font-bold">VS</span>
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-1">봇</p>
          <span className={rolling ? 'animate-bounce' : ''}>{DICE[botDice - 1] || '🎲'}</span>
        </div>
      </div>
      <button
        onClick={roll}
        disabled={rolling}
        className="px-8 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 disabled:opacity-50 transition"
      >
        {rolling ? '굴리는 중...' : '주사위 굴리기'}
      </button>
      <p className="text-gray-400 text-sm">
        {record.w}승 {record.l}패 {record.d}무
      </p>
    </div>
  );
}
