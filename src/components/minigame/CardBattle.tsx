'use client';

import { useState } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

interface Props { onResult: (msg: string) => void; }

const CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export default function CardBattle({ onResult }: Props) {
  const [round, setRound] = useState(1);
  const [myCard, setMyCard] = useState<number | null>(null);
  const [botCard, setBotCard] = useState<number | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [draws, setDraws] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const TOTAL_ROUNDS = 7;

  const drawCards = () => {
    soundManager.play('click');
    const my = Math.floor(Math.random() * 13);
    const bot = Math.floor(Math.random() * 13);
    setMyCard(my);
    setBotCard(bot);
    setRevealed(false);
    setTimeout(() => {
      setRevealed(true);
      soundManager.play('coin-flip');
      if (CARD_VALUES[my] > CARD_VALUES[bot]) setWins(w => w + 1);
      else if (CARD_VALUES[my] < CARD_VALUES[bot]) setLosses(l => l + 1);
      else setDraws(d => d + 1);
    }, 800);
  };

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
      const score = wins * 15 + draws * 5;
      onResult(`${score}점`);
      return;
    }
    setRound(r => r + 1);
    setMyCard(null);
    setBotCard(null);
    setRevealed(false);
  };

  if (gameOver) {
    const score = wins * 15 + draws * 5;
    return (
      <div className="text-center p-4">
        <div className="text-5xl mb-3">🃏</div>
        <p className="text-white font-bold">{wins}승 {losses}패 {draws}무</p>
        <p className="text-yellow-400 text-2xl font-bold mt-2">{score}점</p>
        <button onClick={() => { setGameOver(false); setRound(1); setWins(0); setLosses(0); setDraws(0); setMyCard(null); setBotCard(null); setRevealed(false); }} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold">다시하기</button>
      </div>
    );
  }

  return (
    <div className="text-center p-4">
      <p className="text-gray-400 text-xs mb-2">라운드 {round}/{TOTAL_ROUNDS} | {wins}승 {losses}패 {draws}무</p>
      <div className="flex justify-center items-center gap-6 mb-4">
        <div className="text-center">
          <p className="text-gray-400 text-xs mb-1">나</p>
          <div className={`w-16 h-24 rounded-lg border-2 flex items-center justify-center text-2xl transition-all duration-500 ${
            revealed && myCard !== null ? (CARD_VALUES[myCard] > CARD_VALUES[botCard!] ? 'bg-green-500/20 border-green-500' : CARD_VALUES[myCard] < CARD_VALUES[botCard!] ? 'bg-red-500/20 border-red-500' : 'bg-yellow-500/20 border-yellow-500') : 'bg-gray-700 border-gray-500'
          }`}>
            {revealed && myCard !== null ? CARD_VALUES[myCard] : myCard !== null ? '🂠' : '?'}
          </div>
        </div>
        <span className="text-white text-2xl font-bold">VS</span>
        <div className="text-center">
          <p className="text-gray-400 text-xs mb-1">봇</p>
          <div className={`w-16 h-24 rounded-lg border-2 flex items-center justify-center text-2xl transition-all duration-500 ${
            revealed && botCard !== null ? (CARD_VALUES[botCard] > CARD_VALUES[myCard!] ? 'bg-green-500/20 border-green-500' : CARD_VALUES[botCard] < CARD_VALUES[myCard!] ? 'bg-red-500/20 border-red-500' : 'bg-yellow-500/20 border-yellow-500') : 'bg-gray-700 border-gray-500'
          }`}>
            {revealed && botCard !== null ? CARD_VALUES[botCard] : botCard !== null ? '🂠' : '?'}
          </div>
        </div>
      </div>
      {myCard === null ? (
        <button onClick={drawCards} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-lg">🃏 카드 뽑기!</button>
      ) : revealed ? (
        <button onClick={nextRound} className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold">
          {round >= TOTAL_ROUNDS ? '결과 보기' : '다음 →'}
        </button>
      ) : (
        <p className="text-gray-400 animate-pulse">카드 공개 중...</p>
      )}
    </div>
  );
}
