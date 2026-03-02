'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ref, push } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase/config';

import CoinFlip from './CoinFlip';
import DiceGame from './DiceGame';
import SlotMachine from './SlotMachine';
import MemoryGame from './MemoryGame';
import ReactionTest from './ReactionTest';
import TypingGame from './TypingGame';
import QuizGame from './QuizGame';
import NumberBaseball from './NumberBaseball';
import MoleGame from './MoleGame';
import UpDownGame from './UpDownGame';
import ColorMatch from './ColorMatch';
import RspSpeed from './RspSpeed';
import MathGame from './MathGame';
import WordChain from './WordChain';
import SimonGame from './SimonGame';
import BombGame from './BombGame';
import OddOneOut from './OddOneOut';
import SpeedCalc from './SpeedCalc';
import EmojiQuiz from './EmojiQuiz';
import StackTower from './StackTower';

interface GameInfo {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

const GAMES: GameInfo[] = [
  { id: 'coinflip', name: '동전 던지기', emoji: '🪙', desc: '앞뒤를 맞춰보세요' },
  { id: 'dice', name: '주사위 대결', emoji: '🎲', desc: '봇과 주사위 대결' },
  { id: 'slot', name: '슬롯머신', emoji: '🎰', desc: '777을 노려보세요' },
  { id: 'memory', name: '기억력 게임', emoji: '🧠', desc: '카드 짝 맞추기' },
  { id: 'reaction', name: '반응속도', emoji: '⚡', desc: '초록색이 되면 클릭!' },
  { id: 'typing', name: '타자 게임', emoji: '⌨️', desc: '15초 타자 도전' },
  { id: 'quiz', name: '상식 퀴즈', emoji: '📝', desc: '10문제 도전' },
  { id: 'baseball', name: '숫자 야구', emoji: '⚾', desc: '3자리 숫자를 맞춰라' },
  { id: 'mole', name: '두더지 잡기', emoji: '🔨', desc: '15초간 두더지를 잡아라' },
  { id: 'updown', name: '업다운', emoji: '🔢', desc: '숫자를 맞춰보세요' },
  { id: 'colormatch', name: '색깔 맞추기', emoji: '🎨', desc: '글자색을 빠르게 판단' },
  { id: 'rspspeed', name: '가위바위보 연승', emoji: '✊', desc: '몇 연승까지 가능할까?' },
  { id: 'math', name: '암산 게임', emoji: '🧮', desc: '20초 사칙연산 도전' },
  { id: 'wordchain', name: '끝말잇기', emoji: '💬', desc: '단어를 이어가세요' },
  { id: 'simon', name: '사이먼 게임', emoji: '🔴', desc: '색 순서를 기억하세요' },
  { id: 'bomb', name: '폭탄 돌리기', emoji: '💣', desc: '터지기 전에 답하라!' },
  { id: 'oddoneout', name: '다른 그림 찾기', emoji: '👀', desc: '다른 하나를 찾아라' },
  { id: 'speedcalc', name: '빠른 계산', emoji: '➕', desc: '누가 더 빨리 풀까' },
  { id: 'emojiquiz', name: '이모지 퀴즈', emoji: '😎', desc: '이모지로 단어 맞추기' },
  { id: 'stacktower', name: '탑 쌓기', emoji: '🏗️', desc: '타이밍 맞춰 탑을 쌓아라' },
];

const BOT_GAME_MESSAGES: Record<string, string[]> = {
  coinflip: ['🪙 동전 던지기 시작! 행운을 빌어요~', '🪙 앞? 뒤? 선택하세요!'],
  dice: ['🎲 주사위 굴려볼까요?', '🎲 주사위 대결 시작!'],
  slot: ['🎰 슬롯머신 돌립니다~ 잭팟 기원!', '🎰 777 나와라!'],
  memory: ['🧠 기억력 테스트 시작!', '🧠 카드 짝을 맞춰보세요~'],
  reaction: ['⚡ 반응속도 테스트! 집중하세요~', '⚡ 얼마나 빠를까?'],
  typing: ['⌨️ 타자 게임 시작! 손가락 준비!', '⌨️ 15초 타자 도전!'],
  quiz: ['📝 상식 퀴즈 시작! 몇 개 맞출까?', '🧐 퀴즈왕은 누구?'],
  baseball: ['⚾ 숫자야구 시작! 3자리를 맞춰보세요', '⚾ 스트라이크! 볼!'],
  mole: ['🔨 두더지가 나타났다! 잡아라!', '🕳️ 두더지 잡기 시작!'],
  updown: ['🔢 1~100 숫자를 맞춰보세요!', '⬆️⬇️ 업다운 게임!'],
  colormatch: ['🎨 색깔을 빠르게 판단하세요!', '🌈 스트룹 테스트!'],
  rspspeed: ['✊ 가위바위보 연승 도전!', '✌️ 몇 연승까지?'],
  math: ['🧮 암산 게임 시작! 머리 풀가동!', '🧮 수학의 신은 누구?'],
  wordchain: ['💬 끝말잇기 시작!', '💬 단어를 이어가세요~'],
  simon: ['🔴 사이먼 게임! 순서를 기억하세요', '🟢🔵🟡 색 순서 외우기!'],
  bomb: ['💣 폭탄 돌리기! 터지기 전에 답하라!', '💣 틱틱틱...'],
  oddoneout: ['👀 다른 그림 찾기! 눈을 크게 뜨세요', '🔍 하나가 달라요!'],
  speedcalc: ['➕ 빠른 계산 시작!', '🔢 누가 더 빠를까?'],
  emojiquiz: ['😎 이모지 퀴즈! 뭘 뜻하는 걸까?', '🤔 이모지로 맞춰봐!'],
  stacktower: ['🏗️ 탑 쌓기! 타이밍이 생명!', '🏗️ 얼마나 높이 쌓을까?'],
};

export default function MiniGameLauncher() {
  const { user } = useAuthStore();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  const sendBotChat = (message: string) => {
    if (!user) return;
    const chatRef = ref(realtimeDb, 'chat/main/messages');
    void push(chatRef, {
      uid: 'BOT',
      displayName: '방장봇',
      message,
      isBot: true,
      isSystem: false,
      level: 0,
      timestamp: Date.now(),
    });
  };

  const handleSelectGame = (gameId: string) => {
    setSelectedGame(gameId);
    const messages = BOT_GAME_MESSAGES[gameId];
    if (messages) {
      const msg = messages[Math.floor(Math.random() * messages.length)];
      const displayName = user?.displayName || '누군가';
      sendBotChat(`${msg} (${displayName}님이 시작)`);
    }
  };

  const handleResult = (message: string) => {
    const displayName = user?.displayName || '누군가';
    sendBotChat(`${displayName}님 ${message}`);
  };

  const handleBack = () => setSelectedGame(null);

  const renderGame = () => {
    const props = { onResult: handleResult };
    switch (selectedGame) {
      case 'coinflip':
        return <CoinFlip {...props} />;
      case 'dice':
        return <DiceGame {...props} />;
      case 'slot':
        return <SlotMachine {...props} />;
      case 'memory':
        return <MemoryGame {...props} />;
      case 'reaction':
        return <ReactionTest {...props} />;
      case 'typing':
        return <TypingGame {...props} />;
      case 'quiz':
        return <QuizGame {...props} />;
      case 'baseball':
        return <NumberBaseball {...props} />;
      case 'mole':
        return <MoleGame {...props} />;
      case 'updown':
        return <UpDownGame {...props} />;
      case 'colormatch':
        return <ColorMatch {...props} />;
      case 'rspspeed':
        return <RspSpeed {...props} />;
      case 'math':
        return <MathGame {...props} />;
      case 'wordchain':
        return <WordChain {...props} />;
      case 'simon':
        return <SimonGame {...props} />;
      case 'bomb':
        return <BombGame {...props} />;
      case 'oddoneout':
        return <OddOneOut {...props} />;
      case 'speedcalc':
        return <SpeedCalc {...props} />;
      case 'emojiquiz':
        return <EmojiQuiz {...props} />;
      case 'stacktower':
        return <StackTower {...props} />;
      default:
        return null;
    }
  };

  if (selectedGame) {
    return (
      <div className="flex flex-col gap-3">
        <button
          onClick={handleBack}
          className="self-start px-3 py-1.5 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition"
        >
          ← 게임 목록
        </button>
        {renderGame()}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-white font-bold text-lg text-center">🎮 미니게임</h3>
      <div className="grid grid-cols-4 gap-2">
        {GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => handleSelectGame(game.id)}
            className="flex flex-col items-center gap-1 p-2 bg-gray-800 rounded-xl hover:bg-gray-700 transition border border-gray-700 hover:border-purple-500"
          >
            <span className="text-2xl">{game.emoji}</span>
            <span className="text-white text-xs font-medium leading-tight text-center">{game.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
