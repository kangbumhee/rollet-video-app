'use client';

import { useState } from 'react';
import { ref, push } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase/config';
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

const BOT_GAME_MESSAGES: Record<string, string[]> = {
  coinflip: ['🪙 동전 던지기 시작! 앞면? 뒷면? 운명의 선택!', '🪙 앞이냐 뒤냐! 50:50의 승부!'],
  dice: ['🎲 주사위 대결이다! 높은 숫자가 이긴다!', '🎲 주사위의 신이여, 6을 주세요!'],
  slot: ['🎰 슬롯머신 돌립니다! 잭팟을 노려봐요!', '🎰 777! 대박을 기원합니다!'],
  memory: ['🧠 기억력 테스트! 카드 위치를 기억하세요!', '🧠 두뇌 풀가동! 짝을 맞춰보세요!'],
  reaction: ['⚡ 반응속도 테스트! 번개보다 빠를 수 있을까?', '⚡ 초록불에 빠르게 클릭! 반사신경 대결!'],
  typing: ['⌨️ 타자 게임 시작! 손가락이 불타오른다!', '⌨️ 15초 안에 얼마나 많이 칠 수 있을까?'],
};

function sendBotChat(message: string) {
  const chatRef = ref(realtimeDb, 'chat/main/messages');
  void push(chatRef, {
    uid: 'BOT_HOST',
    displayName: '🎪 방장봇',
    text: message,
    message,
    level: 99,
    timestamp: Date.now(),
    type: 'bot',
    isBot: true,
  });
}

export default function MiniGameLauncher() {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const profile = useAuthStore((s) => s.profile);
  const canAccess = profile?.isAdmin || profile?.isModerator || false;

  if (!canAccess) return null;

  const handleSelectGame = (gameId: string) => {
    setSelectedGame(gameId);
    const msgs = BOT_GAME_MESSAGES[gameId];
    if (msgs && msgs.length > 0) {
      const msg = msgs[Math.floor(Math.random() * msgs.length)];
      sendBotChat(`${profile?.displayName || '익명'}님이 미니게임 중! ${msg}`);
    }
  };

  if (selectedGame) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <button
          onClick={() => setSelectedGame(null)}
          className="text-xs text-gray-400 hover:text-white mb-3 flex items-center gap-1"
        >
          ← 미니게임 목록
        </button>
        {selectedGame === 'coinflip' && <CoinFlip onResult={(msg) => sendBotChat(msg)} />}
        {selectedGame === 'dice' && <DiceGame onResult={(msg) => sendBotChat(msg)} />}
        {selectedGame === 'slot' && <SlotMachine onResult={(msg) => sendBotChat(msg)} />}
        {selectedGame === 'memory' && <MemoryGame onResult={(msg) => sendBotChat(msg)} />}
        {selectedGame === 'reaction' && <ReactionTest onResult={(msg) => sendBotChat(msg)} />}
        {selectedGame === 'typing' && <TypingGame onResult={(msg) => sendBotChat(msg)} />}
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
            onClick={() => handleSelectGame(game.id)}
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
