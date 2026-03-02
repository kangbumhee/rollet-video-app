'use client';
import { useState, useEffect, useRef } from 'react';

interface Props { onResult?: (msg: string) => void; }

const EMOJI_SETS = [
  { normal: '😀', odd: '😃' }, { normal: '🐶', odd: '🐕' },
  { normal: '🍎', odd: '🍏' }, { normal: '🔴', odd: '🟠' },
  { normal: '⭐', odd: '🌟' }, { normal: '💜', odd: '💙' },
  { normal: '🟩', odd: '🟨' }, { normal: '🐱', odd: '🐈' },
  { normal: '🌸', odd: '🌺' }, { normal: '🎵', odd: '🎶' },
];

export default function OddOneOut({ onResult }: Props) {
  const [playing, setPlaying] = useState(false);
  const [grid, setGrid] = useState<{ emoji: string; isOdd: boolean }[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [best, setBest] = useState(0);
  const [gridSize, setGridSize] = useState(9);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const genGrid = (size: number) => {
    const set = EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)];
    const oddIdx = Math.floor(Math.random() * size);
    return Array.from({ length: size }, (_, i) => ({
      emoji: i === oddIdx ? set.odd : set.normal,
      isOdd: i === oddIdx,
    }));
  };

  const start = () => {
    setPlaying(true); setScore(0); setTimeLeft(20); setGridSize(9);
    setGrid(genGrid(9));
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setPlaying(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!playing && score > 0) {
      const nb = Math.max(best, score);
      setBest(nb);
      onResult?.(`👀 다른 그림 찾기 ${score}개! (최고: ${nb}개)`);
    }
  }, [playing]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleClick = (isOdd: boolean) => {
    if (!playing) return;
    if (isOdd) {
      const ns = score + 1;
      setScore(ns);
      const newSize = Math.min(25, 9 + Math.floor(ns / 3) * 2);
      setGridSize(newSize);
      setGrid(genGrid(newSize));
    } else {
      setTimeLeft((t) => Math.max(0, t - 2));
    }
  };

  const cols = gridSize <= 9 ? 3 : gridSize <= 16 ? 4 : 5;

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">👀 다른 그림 찾기</h3>
      {playing ? (
        <>
          <div className="flex justify-between w-full text-sm">
            <span className="text-green-400 font-bold">점수: {score}</span>
            <span className={`font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>⏱ {timeLeft}초</span>
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {grid.map((cell, i) => (
              <button key={i} onClick={() => handleClick(cell.isOdd)} className="w-12 h-12 bg-gray-700 rounded-lg text-2xl flex items-center justify-center hover:bg-gray-600 transition">
                {cell.emoji}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center">
          {score > 0 && <p className="text-green-400 font-bold text-xl mb-2">결과: {score}개</p>}
          <button onClick={start} className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-500 transition">
            {score > 0 ? '다시하기' : '시작하기'}
          </button>
          {best > 0 && <p className="text-yellow-400 text-sm mt-2">최고: {best}개</p>}
        </div>
      )}
    </div>
  );
}
