'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ref, onValue, set, get } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase/config';

interface GameCurrent {
  gameType: string;
  gameName: string;
  phase: string;
  round: number;
  totalRounds: number;
  totalPlayers: number;
  scores: Record<string, number>;
  nameMap: Record<string, string>;
  startedAt: number;
  startedBy: string;
  roundsReady?: boolean;
}

interface RoundData {
  round: number;
  mult: number;
  type: string;
  choices: string[] | string;
  choiceLabels: string[];
  timeLimit: number;
  [key: string]: unknown;
}

interface RegularGamePlayerProps {
  roomId: string;
  uid: string;
  displayName: string;
}

export default function RegularGamePlayer({ roomId, uid, displayName }: RegularGamePlayerProps) {
  const [current, setCurrent] = useState<GameCurrent | null>(null);
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [myChoice, setMyChoice] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundResult, setRoundResult] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [rankings, setRankings] = useState<{ uid: string; name: string; score: number }[]>([]);

  useEffect(() => {
    const currentRef = ref(realtimeDb, `games/${roomId}/current`);
    const unsub = onValue(currentRef, (snap) => {
      if (snap.exists()) setCurrent(snap.val() as GameCurrent);
      else setCurrent(null);
    });
    return () => unsub();
  }, [roomId]);

  const calculatePoints = useCallback((rd: RoundData, choice: string): number => {
    const mult = rd.mult || 1;
    switch (rd.type) {
      case 'luckyDice': {
        const sum = (rd.sum as number) || 0;
        if (choice === 'safe') return Math.floor(sum / 2) * mult;
        const hasSeven = rd.hasSeven as boolean;
        return hasSeven ? 0 : sum * mult;
      }
      case 'stockRace': {
        const changes = (rd.changes as number[]) || [0, 0, 0];
        const idx = parseInt(choice, 10);
        return (changes[idx] || 0) * mult;
      }
      case 'highLow': {
        const actual = rd.actual as string;
        return choice === actual ? 20 * mult : -10 * mult;
      }
      case 'coinBet': {
        const bet = choice === 'allin' ? 100 : parseInt(choice, 10);
        return Math.random() < 0.5 ? bet * mult : -bet * mult;
      }
      case 'horseRace': {
        const result = (rd.result as number[]) || [];
        const myHorse = parseInt(choice, 10);
        const rank = result.indexOf(myHorse);
        const pts = [50, 30, 10, -10, -20];
        return (pts[rank] || 0) * mult;
      }
      case 'floorRoulette': {
        const winZone = rd.winZone as number;
        return parseInt(choice, 10) === winZone ? 40 * mult : -15 * mult;
      }
      case 'goldRush': {
        const golds = (rd.golds as number[]) || [0, 0, 0];
        const idx = parseInt(choice, 10);
        return (golds[idx] || 0) * mult;
      }
      case 'bombDefuse': {
        const bombWire = rd.bombWire as number;
        return parseInt(choice, 10) !== bombWire ? 30 * mult : -30 * mult;
      }
      case 'tideWave': {
        const seaLevel = rd.seaLevel as number;
        const guess = parseInt(choice, 10) || 50;
        const diff = Math.abs(guess - seaLevel);
        if (diff <= 5) return 50 * mult;
        if (diff <= 15) return 20 * mult;
        if (diff <= 30) return 0;
        return -15 * mult;
      }
      case 'treasureHunt': {
        const grid = (rd.grid as number[]) || [];
        const idx = parseInt(choice, 10);
        return (grid[idx] || 0) * mult;
      }
      default:
        return 0;
    }
  }, []);

  const submitChoice = useCallback(async (choice: string) => {
    if (myChoice !== null) return;
    setMyChoice(choice);

    await set(ref(realtimeDb, `games/${roomId}/playerChoices/round${current?.round}/${uid}`), {
      choice,
      timestamp: Date.now(),
      displayName,
    });

    if (roundData) {
      const points = calculatePoints(roundData, choice);
      setRoundResult(points > 0 ? `+${points}점!` : points === 0 ? '0점' : `${points}점`);

      const scoreRef = ref(realtimeDb, `games/${roomId}/current/scores/${uid}`);
      const scoreSnap = await get(scoreRef);
      const currentScore = scoreSnap.exists() ? (scoreSnap.val() as number) : 0;
      await set(scoreRef, currentScore + points);

      setShowResult(true);

      setTimeout(async () => {
        setShowResult(false);
        setMyChoice(null);
        setRoundResult(null);

        if (current && current.round < current.totalRounds) {
          const nextRound = current.round + 1;
          const choicesSnap = await get(ref(realtimeDb, `games/${roomId}/playerChoices/round${current.round}`));
          const choiceCount = choicesSnap.exists() ? Object.keys(choicesSnap.val() as object).length : 0;
          if (choiceCount >= current.totalPlayers) {
            await set(ref(realtimeDb, `games/${roomId}/current/round`), nextRound);
          }
        } else if (current && current.round >= current.totalRounds) {
          await set(ref(realtimeDb, `games/${roomId}/current/phase`), 'final_result');
        }
      }, 3000);
    }
  }, [myChoice, roomId, current, uid, displayName, roundData, calculatePoints]);

  const handleAutoChoice = useCallback(async () => {
    if (!roundData || myChoice !== null) return;
    const choices = Array.isArray(roundData.choices) ? roundData.choices : ['50'];
    const randomChoice = choices[Math.floor(Math.random() * choices.length)];
    await submitChoice(randomChoice);
  }, [roundData, myChoice, submitChoice]);

  useEffect(() => {
    if (!current || current.phase === 'game_intro' || current.phase === 'final_result') return;
    const roundRef = ref(realtimeDb, `games/${roomId}/rounds/round${current.round}`);
    const unsub = onValue(roundRef, (snap) => {
      if (snap.exists()) setRoundData(snap.val() as RoundData);
    });
    return () => unsub();
  }, [roomId, current]);

  useEffect(() => {
    if (!roundData || myChoice !== null || !current || current.phase !== 'round_waiting') return;
    setTimeLeft(roundData.timeLimit);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          void handleAutoChoice();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [roundData, myChoice, current, handleAutoChoice]);

  useEffect(() => {
    if (!current?.scores || !current?.nameMap) return;
    const sorted = Object.entries(current.scores)
      .map(([id, score]) => ({ uid: id, name: current.nameMap[id] || id.slice(0, 6), score }))
      .sort((a, b) => b.score - a.score);
    setRankings(sorted);
  }, [current?.scores, current?.nameMap]);

  if (!current) return null;

  if (current.phase === 'game_intro') {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4 animate-fade-in">
        <div className="text-6xl animate-bounce">🎮</div>
        <h2 className="text-2xl font-bold text-white">{current.gameName}</h2>
        <p className="text-gray-400">{current.totalPlayers}명 참가 · {current.totalRounds}라운드</p>
        <div className="flex items-center gap-2 text-yellow-400 text-sm">
          <span className="animate-pulse">잠시 후 시작됩니다...</span>
        </div>
      </div>
    );
  }

  if (current.phase === 'final_result') {
    return (
      <div className="flex flex-col items-center p-4 space-y-4 overflow-y-auto">
        <div className="text-5xl mb-2">🏆</div>
        <h2 className="text-xl font-bold text-yellow-400">{current.gameName} 결과</h2>
        <div className="w-full max-w-sm space-y-2">
          {rankings.map((r, i) => (
            <div
              key={r.uid}
              className={`flex items-center justify-between px-4 py-2 rounded-xl ${
                i === 0
                  ? 'bg-yellow-500/20 border border-yellow-500/50'
                  : i === 1
                    ? 'bg-gray-500/20 border border-gray-500/30'
                    : i === 2
                      ? 'bg-orange-500/20 border border-orange-500/30'
                      : 'bg-gray-800/50'
              } ${r.uid === uid ? 'ring-2 ring-purple-500' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold w-8 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <span className={`text-sm font-medium ${r.uid === uid ? 'text-purple-300' : 'text-white'}`}>
                  {r.name} {r.uid === uid && '(나)'}
                </span>
              </div>
              <span className="text-sm font-bold text-yellow-400">{r.score}점</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-purple-400 text-sm font-bold">{current.gameName}</span>
          <h3 className="text-white font-bold text-lg">
            Round {current.round}/{current.totalRounds}
            {roundData?.mult === 2 && <span className="text-red-400 ml-2 text-sm">x2 BONUS!</span>}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {timeLeft > 0 && myChoice === null && (
            <span className={`text-lg font-bold ${timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
              ⏱ {timeLeft}초
            </span>
          )}
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl px-4 py-2 flex items-center justify-between">
        <span className="text-gray-400 text-sm">내 점수</span>
        <span className="text-yellow-400 font-bold text-lg">{current.scores?.[uid] || 0}점</span>
      </div>

      {roundData && (
        <div className="bg-gray-800/30 rounded-xl p-4 text-center">
          {roundData.type === 'luckyDice' && (
            <div>
              <p className="text-gray-400 text-sm mb-2">주사위 결과</p>
              <div className="flex justify-center gap-3 text-4xl mb-2">
                {(roundData.dice as number[])?.map((d, i) => (
                  <span key={i}>{'⚀⚁⚂⚃⚄⚅'[d - 1]}</span>
                ))}
              </div>
              <p className="text-white font-bold text-xl">합계: {roundData.sum as number}</p>
              {(roundData.hasSeven as boolean) && <p className="text-red-400 text-sm mt-1">⚠️ 7 또는 14!</p>}
            </div>
          )}
          {roundData.type === 'highLow' && (
            <div>
              <p className="text-gray-400 text-sm mb-2">현재 카드</p>
              <p className="text-5xl font-bold text-white mb-1">{roundData.currentCardName as string}</p>
              <p className="text-gray-500 text-xs">다음 카드가 높을까? 낮을까?</p>
            </div>
          )}
          {roundData.type === 'horseRace' && <p className="text-gray-400 text-sm">어떤 말에 베팅하시겠습니까?</p>}
          {roundData.type === 'stockRace' && <p className="text-gray-400 text-sm">어떤 종목에 투자하시겠습니까?</p>}
          {roundData.type === 'coinBet' && (
            <div>
              <p className="text-4xl mb-2">🪙</p>
              <p className="text-gray-400 text-sm">베팅 금액을 선택하세요</p>
            </div>
          )}
          {roundData.type === 'floorRoulette' && <p className="text-gray-400 text-sm">안전한 색을 고르세요!</p>}
          {roundData.type === 'goldRush' && <p className="text-gray-400 text-sm">어떤 광산에서 채굴할까요?</p>}
          {roundData.type === 'bombDefuse' && (
            <div>
              <p className="text-4xl mb-2">💣</p>
              <p className="text-gray-400 text-sm">어떤 선을 끊으시겠습니까?</p>
            </div>
          )}
          {roundData.type === 'tideWave' && (
            <div>
              <p className="text-4xl mb-2">🌊</p>
              <p className="text-gray-400 text-sm">파도 높이를 예측하세요 (0~100)</p>
            </div>
          )}
          {roundData.type === 'treasureHunt' && (
            <div>
              <p className="text-4xl mb-2">🗺️</p>
              <p className="text-gray-400 text-sm">5x5 격자에서 보물을 찾으세요!</p>
            </div>
          )}
        </div>
      )}

      {roundData && myChoice === null && !showResult && (
        <div className="space-y-2">
          {roundData.choices === 'number' ? (
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={100}
                placeholder="0~100"
                className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 text-center text-lg border border-gray-700 focus:border-purple-500 outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (val) void submitChoice(val);
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                  if (input?.value) void submitChoice(input.value);
                }}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-500"
              >
                확인
              </button>
            </div>
          ) : roundData.choices === 'grid25' ? (
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 25 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => void submitChoice(String(i))}
                  className="aspect-square bg-gray-700 hover:bg-purple-600 rounded-lg text-white text-xs font-bold transition-colors border border-gray-600 hover:border-purple-400"
                >
                  {i + 1}
                </button>
              ))}
            </div>
          ) : (
            <div className={`grid ${(roundData.choiceLabels?.length || 0) <= 3 ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
              {(roundData.choices as string[])?.map((choice, i) => (
                <button
                  key={choice}
                  onClick={() => void submitChoice(choice)}
                  className="px-4 py-4 bg-gray-800 hover:bg-purple-600/50 border border-gray-700 hover:border-purple-500 rounded-xl text-white font-bold text-sm transition-all active:scale-95"
                >
                  {roundData.choiceLabels?.[i] || choice}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showResult && (
        <div className="flex flex-col items-center py-6 animate-fade-in">
          <div className={`text-3xl font-bold ${
            roundResult?.startsWith('+') ? 'text-green-400' : roundResult?.startsWith('-') ? 'text-red-400' : 'text-gray-400'
          }`}>
            {roundResult}
          </div>
          <p className="text-gray-500 text-sm mt-2">다음 라운드 준비 중...</p>
        </div>
      )}

      <div className="bg-gray-800/30 rounded-xl p-3">
        <p className="text-gray-500 text-xs mb-2 font-bold">📊 실시간 순위</p>
        <div className="space-y-1">
          {rankings.slice(0, 5).map((r, i) => (
            <div key={r.uid} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${r.uid === uid ? 'bg-purple-500/20' : ''}`}>
              <span className="text-gray-400">
                {i + 1}. <span className={r.uid === uid ? 'text-purple-300 font-bold' : 'text-white'}>{r.name}</span>
              </span>
              <span className="text-yellow-400 font-bold">{r.score}</span>
            </div>
          ))}
          {rankings.length > 5 && (
            <p className="text-gray-600 text-[10px] text-center">+{rankings.length - 5}명 더</p>
          )}
        </div>
      </div>
    </div>
  );
}
