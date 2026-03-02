'use client';

import { useState, useEffect } from 'react';

const EMOJIS = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼'];

interface Props {
  onResult?: (msg: string) => void;
}

export default function MemoryGame({ onResult }: Props) {
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const reset = () => {
    setCards(shuffle([...EMOJIS, ...EMOJIS]));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setDone(false);
  };

  useEffect(() => {
    reset();
  }, []);

  const handleClick = (idx: number) => {
    if (done || flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;
    const nf = [...flipped, idx];
    setFlipped(nf);
    if (nf.length === 2) {
      setMoves((m) => m + 1);
      if (cards[nf[0]] === cards[nf[1]]) {
        const nm = [...matched, nf[0], nf[1]];
        setMatched(nm);
        setFlipped([]);
        if (nm.length === cards.length) {
          setDone(true);
          onResult?.(`🧠 기억력 게임 완료! ${moves + 1}번 만에 성공!`);
        }
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">🧠 기억력 게임</h3>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            className={`w-14 h-14 rounded-lg text-2xl flex items-center justify-center transition-all duration-300 ${
              flipped.includes(i) || matched.includes(i) ? 'bg-white' : 'bg-purple-700 hover:bg-purple-600'
            }`}
          >
            {flipped.includes(i) || matched.includes(i) ? c : '?'}
          </button>
        ))}
      </div>
      <p className="text-gray-400 text-sm">시도: {moves}회 | 남은 짝: {(cards.length - matched.length) / 2}</p>
      {done && (
        <div className="text-center">
          <p className="text-green-400 font-bold">🎉 {moves}번 만에 완료!</p>
          <button onClick={reset} className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition">
            다시하기
          </button>
        </div>
      )}
    </div>
  );
}
