'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { get, push, ref, set } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase/config';
import { soundManager } from '@/lib/sounds/SoundManager';

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

const RECORD_MESSAGES: Record<string, (name: string, score: string) => string[]> = {
  coinflip: (n, s) => [`🪙 ${n}님이 동전 던지기 ${s} 신기록 달성! 🏆`],
  dice: (n, s) => [`🎲 ${n}님이 주사위 대결 ${s} 신기록!`],
  slot: (n, s) => [`🎰 ${n}님이 슬롯머신에서 대박! ${s}`],
  memory: (n, s) => [`🧠 ${n}님이 기억력 게임 ${s} 신기록!`],
  reaction: (n, s) => [`⚡ ${n}님 반응속도 ${s} 신기록! 번개손!`],
  typing: (n, s) => [`⌨️ ${n}님 타자 게임 ${s} 신기록!`],
  quiz: (n, s) => [`📝 ${n}님 상식 퀴즈 ${s} 신기록!`],
  baseball: (n, s) => [`⚾ ${n}님 숫자야구 ${s} 신기록!`],
  mole: (n, s) => [`🔨 ${n}님 두더지 ${s} 신기록!`],
  updown: (n, s) => [`🔢 ${n}님 업다운 ${s} 신기록!`],
  colormatch: (n, s) => [`🎨 ${n}님 색깔 맞추기 ${s} 신기록!`],
  rspspeed: (n, s) => [`✊ ${n}님 가위바위보 ${s} 신기록!`],
  math: (n, s) => [`🧮 ${n}님 암산 ${s} 신기록!`],
  wordchain: (n, s) => [`💬 ${n}님 끝말잇기 ${s} 신기록!`],
  simon: (n, s) => [`🔴 ${n}님 사이먼 게임 ${s} 신기록!`],
  bomb: (n, s) => [`💣 ${n}님 폭탄 돌리기 ${s} 신기록!`],
  oddoneout: (n, s) => [`👀 ${n}님 다른 그림 찾기 ${s} 신기록!`],
  speedcalc: (n, s) => [`➕ ${n}님 빠른 계산 ${s} 신기록!`],
  emojiquiz: (n, s) => [`😎 ${n}님 이모지 퀴즈 ${s} 신기록!`],
  stacktower: (n, s) => [`🏗️ ${n}님 탑 쌓기 ${s} 신기록!`],
};

interface MiniGameLauncherProps {
  roomId?: string;
}

export default function MiniGameLauncher({ roomId = 'main' }: MiniGameLauncherProps) {
  const { user, profile } = useAuthStore();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [records, setRecords] = useState<Record<string, { score: number; holder: string; scoreLabel?: string }>>({});

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const snap = await get(ref(realtimeDb, 'miniGameRecords'));
        if (snap.exists()) setRecords(snap.val() as Record<string, { score: number; holder: string; scoreLabel?: string }>);
      } catch {
        // ignore
      }
    };
    void loadRecords();
  }, []);

  const sendBotChat = (message: string) => {
    const chatRef = ref(realtimeDb, `chat/${roomId}/messages`);
    void push(chatRef, {
      uid: 'BOT',
      displayName: '🏆 신기록봇',
      message,
      text: message,
      isBot: true,
      isSystem: false,
      level: 0,
      timestamp: Date.now(),
      type: 'bot',
    });
  };

  const lowerIsBetter = (gameId: string) => ['reaction', 'baseball', 'updown', 'memory'].includes(gameId);

  const extractScore = (gameId: string, raw: string): number | null => {
    const m = raw.match(/\d+/);
    if (!m) return null;
    const value = Number(m[0]);
    if (!Number.isFinite(value)) return null;
    if (gameId === 'reaction' && raw.includes('ms')) return value;
    return value;
  };

  const checkAndUpdateRecord = async (gameId: string, rawResult: string) => {
    if (!user) return;
    const score = extractScore(gameId, rawResult);
    if (score == null) return;
    const displayName = profile?.displayName || user.displayName || '누군가';
    const scoreLabel = rawResult;
    const recordRef = ref(realtimeDb, `miniGameRecords/${gameId}`);

    try {
      const snap = await get(recordRef);
      const current = snap.exists() ? (snap.val() as { score: number }) : null;
      let isNewRecord = false;
      if (!current) isNewRecord = true;
      else if (lowerIsBetter(gameId)) isNewRecord = score < current.score;
      else isNewRecord = score > current.score;

      if (!isNewRecord) return;

      soundManager.play('new-record');
      await set(recordRef, {
        score,
        scoreLabel,
        holder: displayName,
        holderId: user.uid,
        updatedAt: Date.now(),
      });
      setRecords((prev) => ({ ...prev, [gameId]: { score, holder: displayName, scoreLabel } }));

      const msgs = RECORD_MESSAGES[gameId];
      if (msgs) {
        const arr = msgs(displayName, scoreLabel);
        sendBotChat(arr[Math.floor(Math.random() * arr.length)]);
      }
    } catch {
      // ignore
    }
  };

  const handleSelectGame = (gameId: string) => {
    soundManager.play('click');
    setSelectedGame(gameId);
  };

  const handleResult = (gameId: string, message: string) => {
    void checkAndUpdateRecord(gameId, message);
  };

  const handleBack = () => setSelectedGame(null);

  const renderGame = () => {
    const rec = selectedGame ? records[selectedGame] : null;
    const recordDisplay = rec ? `🏆 신기록: ${rec.holder} (${rec.scoreLabel || rec.score})` : null;
    const props = { onResult: (msg: string) => selectedGame && handleResult(selectedGame, msg) };
    switch (selectedGame) {
      case 'coinflip':
        return (
          <>
            {recordDisplay && <span className="text-yellow-400 text-xs font-bold">{recordDisplay}</span>}
            <CoinFlip {...props} />
          </>
        );
      case 'dice':
        return (
          <>
            {recordDisplay && <span className="text-yellow-400 text-xs font-bold">{recordDisplay}</span>}
            <DiceGame {...props} />
          </>
        );
      case 'slot':
        return (
          <>
            {recordDisplay && <span className="text-yellow-400 text-xs font-bold">{recordDisplay}</span>}
            <SlotMachine {...props} />
          </>
        );
      case 'memory':
        return (
          <>
            {recordDisplay && <span className="text-yellow-400 text-xs font-bold">{recordDisplay}</span>}
            <MemoryGame {...props} />
          </>
        );
      case 'reaction':
        return (
          <>
            {recordDisplay && <span className="text-yellow-400 text-xs font-bold">{recordDisplay}</span>}
            <ReactionTest {...props} />
          </>
        );
      case 'typing':
        return (
          <>
            {recordDisplay && <span className="text-yellow-400 text-xs font-bold">{recordDisplay}</span>}
            <TypingGame {...props} />
          </>
        );
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
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center justify-between sticky top-0 bg-gray-900 z-10 py-2">
          <button
            onClick={handleBack}
            className="px-3 py-1.5 bg-gray-700 text-white text-xs rounded-lg hover:bg-gray-600 transition font-bold"
          >
            ← 목록으로
          </button>
          <span className="text-white text-xs font-bold">
            {GAMES.find((g) => g.id === selectedGame)?.emoji} {GAMES.find((g) => g.id === selectedGame)?.name}
          </span>
          {records[selectedGame] && (
            <span className="text-yellow-400 text-[10px] font-bold truncate ml-2">
              🏆 {records[selectedGame].holder}
            </span>
          )}
        </div>
        <div className="overflow-y-auto pb-32">{renderGame()}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 헤더 버튼 — 더 눈에 띄는 디자인 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-xl hover:border-indigo-500/60 transition"
      >
        <span className="text-white font-bold text-sm">🎮 미니게임</span>
        <span className="text-indigo-300 text-xs font-medium">{expanded ? '접기 ▲' : `펼치기 ▼ (${GAMES.length}종)`}</span>
      </button>

      {/* 접힌 상태에서도 인기 게임 미리보기 4개 표시 */}
      {!expanded && (
        <div className="grid grid-cols-4 gap-1.5">
          {GAMES.slice(0, 4).map((game) => (
            <button
              key={game.id}
              onClick={() => handleSelectGame(game.id)}
              className="flex flex-col items-center gap-0.5 p-2 bg-gray-800/60 rounded-lg hover:bg-gray-700 transition border border-gray-700/30 hover:border-purple-500/50"
            >
              <span className="text-lg leading-none">{game.emoji}</span>
              <span className="text-white text-[8px] font-medium leading-tight text-center truncate w-full">
                {game.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 펼친 상태 — 전체 게임 목록 */}
      {expanded && (
        <div className="max-h-[50vh] overflow-y-auto rounded-xl bg-gray-900/50 p-2 pb-6">
          <div className="grid grid-cols-5 gap-1.5">
            {GAMES.map((game) => {
              const rec = records[game.id];
              return (
                <button
                  key={game.id}
                  onClick={() => handleSelectGame(game.id)}
                  className="flex flex-col items-center gap-0.5 p-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 transition border border-gray-700/50 hover:border-purple-500/50"
                >
                  <span className="text-lg leading-none">{game.emoji}</span>
                  <span className="text-white text-[9px] font-medium leading-tight text-center truncate w-full">
                    {game.name}
                  </span>
                  {rec && (
                    <span className="text-yellow-400 text-[7px] truncate w-full text-center">
                      🏆{rec.holder}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* 하단 여백 — 채팅에 의해 짤리지 않도록 */}
          <div className="h-4" />
        </div>
      )}
    </div>
  );
}
