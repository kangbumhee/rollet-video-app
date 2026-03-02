'use client';
import { useState, useEffect, useRef } from 'react';

interface Props { onResult?: (msg: string) => void; }

const COLORS: { name: string; hex: string }[] = [
  { name: '빨강', hex: '#EF4444' },
  { name: '파랑', hex: '#3B82F6' },
  { name: '초록', hex: '#22C55E' },
  { name: '노랑', hex: '#EAB308' },
  { name: '보라', hex: '#A855F7' },
  { name: '주황', hex: '#F97316' },
];

export default function ColorMatch({ onResult }: Props) {
  const [playing, setPlaying] = useState(false);
  const [textColor, setTextColor] = useState(COLORS[0]);
  const [displayColor, setDisplayColor] = useState(COLORS[0]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [best, setBest] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nextRound = () => {
    const tc = COLORS[Math.floor(Math.random() * COLORS.length)];
    const dc = COLORS[Math.floor(Math.random() * COLORS.length)];
    setTextColor(tc);
    setDisplayColor(dc);
  };

  const start = () => {
    setPlaying(true); setScore(0); setTimeLeft(20); nextRound();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPlaying(false);
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
      onResult?.(`🎨 색깔 맞추기 ${score}점! (최고: ${nb}점)`);
    }
  }, [playing]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const answer = (match: boolean) => {
    if (!playing) return;
    const isMatch = textColor.name === displayColor.name;
    if (match === isMatch) setScore((s) => s + 1);
    nextRound();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">🎨 색깔 맞추기</h3>
      {playing ? (
        <>
          <div className="flex justify-between w-full text-sm">
            <span className="text-green-400 font-bold">점수: {score}</span>
            <span className={`font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>⏱ {timeLeft}초</span>
          </div>
          <p className="text-sm text-gray-400">글자의 색깔과 텍스트가 일치하나요?</p>
          <p className="text-5xl font-black py-4" style={{ color: displayColor.hex }}>{textColor.name}</p>
          <div className="flex gap-4">
            <button onClick={() => answer(true)} className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-500 transition">⭕ 일치</button>
            <button onClick={() => answer(false)} className="px-8 py-3 bg-red-600 text-white rounded-lg font-bold text-lg hover:bg-red-500 transition">❌ 불일치</button>
          </div>
        </>
      ) : (
        <div className="text-center">
          {score > 0 && <p className="text-green-400 font-bold text-xl mb-2">결과: {score}점</p>}
          <button onClick={start} className="px-8 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">
            {score > 0 ? '다시하기' : '시작하기'}
          </button>
          {best > 0 && <p className="text-yellow-400 text-sm mt-2">최고: {best}점</p>}
        </div>
      )}
    </div>
  );
}
