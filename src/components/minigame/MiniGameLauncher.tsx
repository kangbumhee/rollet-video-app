'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import CoinFlip from './CoinFlip';
import DiceGame from './DiceGame';
import SlotMachine from './SlotMachine';
import MemoryGame from './MemoryGame';
import ReactionTest from './ReactionTest';
import TypingGame from './TypingGame';

const MINI_GAMES = [
  { id: 'coinflip', name: '동전 던지기', emoji: '🪙', desc: '앞뒤를 맞춰보세요!' },
  { id: 'dice', name: '주사위 게임', emoji: '🎲', desc: '높은 숫자가 이긴다!' },
  { id: 'slot', name: '슬롯머신', emoji: '🎰', desc: '3개를 맞춰보세요!' },
  { id: 'memory', name: '기억력 게임', emoji: '🧠', desc: '카드 짝을 맞춰보세요!' },
  { id: 'reaction', name: '반응속도 테스트', emoji: '⚡', desc: '얼마나 빠르세요?' },
  { id: 'typing', name: '타자 게임', emoji: '⌨️', desc: '빠르게 입력하세요!' },
];

export default function MiniGameLauncher() {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const profile = useAuthStore((s) => s.profile);
  const canAccess = profile?.isAdmin || profile?.isModerator || false;

  if (!canAccess) return null;

  if (selectedGame) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <button
          onClick={() => setSelectedGame(null)}
          className="text-xs text-gray-400 hover:text-white mb-3 flex items-center gap-1"
        >
          ← 미니게임 목록
        </button>
        {selectedGame === 'coinflip' && <CoinFlip />}
        {selectedGame === 'dice' && <DiceGame />}
        {selectedGame === 'slot' && <SlotMachine />}
        {selectedGame === 'memory' && <MemoryGame />}
        {selectedGame === 'reaction' && <ReactionTest />}
        {selectedGame === 'typing' && <TypingGame />}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto mt-4">
      <p className="text-xs text-gray-500 text-center mb-3">⏳ 대기 중 미니게임</p>
      <div className="grid grid-cols-3 gap-2">
        {MINI_GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => setSelectedGame(game.id)}
            className="flex flex-col items-center gap-1 p-3 bg-gray-800/50 border border-gray-700 rounded-xl
                       hover:border-yellow-500/50 hover:bg-gray-800 active:scale-95 transition-all"
            title={game.desc}
          >
            <span className="text-2xl">{game.emoji}</span>
            <span className="text-[10px] text-gray-300 font-medium">{game.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
