'use client';

import { useState, useEffect } from 'react';

const EMOJIS = ['🐶', '🐱', '🐻', '🐼', '🦊', '🐸', '🐵', '🐰'];

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

export default function MemoryGame() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [completed, setCompleted] = useState(false);

  const initGame = () => {
    const subset = EMOJIS.slice(0, 6);
    const pairs = [...subset, ...subset]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
    setCards(pairs);
    setSelected([]);
    setMoves(0);
    setCompleted(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleClick = (id: number) => {
    if (selected.length >= 2) return;
    const card = cards[id];
    if (!card || card.flipped || card.matched) return;

    const newCards = [...cards];
    newCards[id].flipped = true;
    setCards(newCards);

    const newSelected = [...selected, id];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = newSelected;
      if (newCards[a].emoji === newCards[b].emoji) {
        setTimeout(() => {
          const matched = [...newCards];
          matched[a].matched = true;
          matched[b].matched = true;
          setCards(matched);
          setSelected([]);
          if (matched.every((c) => c.matched)) setCompleted(true);
        }, 300);
      } else {
        setTimeout(() => {
          const reset = [...newCards];
          reset[a].flipped = false;
          reset[b].flipped = false;
          setCards(reset);
          setSelected([]);
        }, 800);
      }
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 text-center">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400">기억력 게임 🧠</p>
        <p className="text-xs text-gray-500">{moves}회 시도</p>
      </div>

      {completed && <p className="text-green-400 font-bold text-sm mb-3">🎉 {moves}회 만에 완료!</p>}

      <div className="grid grid-cols-4 gap-2 mb-4">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleClick(card.id)}
            className={`w-full aspect-square rounded-lg text-xl flex items-center justify-center transition-all ${
              card.matched
                ? 'bg-green-500/20 border border-green-500/50'
                : card.flipped
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : 'bg-gray-700 border border-gray-600 hover:border-gray-500 active:scale-95'
            }`}
          >
            {card.flipped || card.matched ? card.emoji : '?'}
          </button>
        ))}
      </div>

      <button onClick={initGame} className="text-xs text-gray-400 hover:text-white transition-colors">
        🔄 다시 시작
      </button>
    </div>
  );
}
