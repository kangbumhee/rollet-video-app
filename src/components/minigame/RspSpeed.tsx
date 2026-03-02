'use client';
import { useState } from 'react';

interface Props { onResult?: (msg: string) => void; }
type Choice = 'rock' | 'scissors' | 'paper';

const CHOICES: { id: Choice; emoji: string; name: string }[] = [
  { id: 'rock', emoji: '✊', name: '바위' },
  { id: 'scissors', emoji: '✌️', name: '가위' },
  { id: 'paper', emoji: '🖐', name: '보' },
];
const WIN: Record<Choice, Choice> = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

export default function RspSpeed({ onResult }: Props) {
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [botChoice, setBotChoice] = useState<Choice | null>(null);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const play = (my: Choice) => {
    if (gameOver) { reset(); return; }
    const bot = CHOICES[Math.floor(Math.random() * 3)].id;
    setBotChoice(bot);
    if (my === bot) {
      setResult('draw');
    } else if (WIN[my] === bot) {
      const ns = streak + 1;
      setStreak(ns);
      setResult('win');
      if (ns > best) setBest(ns);
    } else {
      setResult('lose');
      setGameOver(true);
      onResult?.(`✊ 가위바위보 ${streak}연승에서 탈락!${streak > 0 ? ` (최고: ${Math.max(best, streak)}연승)` : ''}`);
    }
  };

  const reset = () => {
    setStreak(0);
    setBotChoice(null);
    setResult(null);
    setGameOver(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">✊ 가위바위보 연승</h3>
      <p className="text-yellow-400 font-bold text-2xl">🔥 {streak}연승</p>
      {botChoice && (
        <div className="text-center">
          <p className="text-4xl mb-1">{CHOICES.find((c) => c.id === botChoice)?.emoji}</p>
          <p className={`font-bold ${result === 'win' ? 'text-green-400' : result === 'lose' ? 'text-red-400' : 'text-yellow-400'}`}>
            {result === 'win' ? '승리!' : result === 'lose' ? '패배...' : '무승부!'}
          </p>
        </div>
      )}
      <div className="flex gap-3">
        {CHOICES.map((c) => (
          <button key={c.id} onClick={() => play(c.id)} className="flex flex-col items-center px-5 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition">
            <span className="text-4xl">{c.emoji}</span>
            <span className="text-white text-sm mt-1">{c.name}</span>
          </button>
        ))}
      </div>
      {gameOver && <button onClick={reset} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-500 transition">다시 도전</button>}
      {best > 0 && <p className="text-gray-400 text-sm">최고: {best}연승</p>}
    </div>
  );
}
