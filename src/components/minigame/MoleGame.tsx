'use client';
import { useState, useEffect, useRef } from 'react';

interface Props { onResult?: (msg: string) => void; }

export default function MoleGame({ onResult }: Props) {
  const [playing, setPlaying] = useState(false);
  const [moles, setMoles] = useState(Array(9).fill(false));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [best, setBest] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    setPlaying(true);
    setScore(0);
    setTimeLeft(15);
    setMoles(Array(9).fill(false));
    startMoles();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { endGame(); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const startMoles = () => {
    const loop = () => {
      setMoles(() => {
        const next = Array(9).fill(false);
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          next[Math.floor(Math.random() * 9)] = true;
        }
        return next;
      });
      moleRef.current = setTimeout(loop, 600 + Math.random() * 400);
    };
    loop();
  };

  const endGame = () => {
    setPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (moleRef.current) clearTimeout(moleRef.current);
    setMoles(Array(9).fill(false));
  };

  useEffect(() => {
    if (!playing && score > 0) {
      const nb = Math.max(best, score);
      setBest(nb);
      onResult?.(`🔨 두더지 잡기 ${score}마리! (최고: ${nb}마리)`);
    }
  }, [playing]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (moleRef.current) clearTimeout(moleRef.current);
  }, []);

  const whack = (idx: number) => {
    if (!playing || !moles[idx]) return;
    setScore((s) => s + 1);
    setMoles((prev) => {
      const n = [...prev];
      n[idx] = false;
      return n;
    });
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">🔨 두더지 잡기</h3>
      {playing && (
        <div className="flex justify-between w-full text-sm">
          <span className="text-green-400 font-bold">점수: {score}</span>
          <span className={`font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>⏱ {timeLeft}초</span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {moles.map((up, i) => (
          <button
            key={i}
            onClick={() => whack(i)}
            className={`w-20 h-20 rounded-xl text-3xl flex items-center justify-center transition-all duration-150 ${
              up ? 'bg-yellow-600 scale-110' : 'bg-gray-700'
            }`}
          >
            {up ? '🐹' : '🕳️'}
          </button>
        ))}
      </div>
      {!playing && (
        <div className="text-center">
          {score > 0 && <p className="text-green-400 font-bold mb-2">결과: {score}마리</p>}
          <button onClick={start} className="px-8 py-3 bg-yellow-600 text-white rounded-lg font-bold hover:bg-yellow-500 transition">
            {score > 0 ? '다시하기' : '시작하기'}
          </button>
          {best > 0 && <p className="text-yellow-400 text-sm mt-1">최고: {best}마리</p>}
        </div>
      )}
    </div>
  );
}
