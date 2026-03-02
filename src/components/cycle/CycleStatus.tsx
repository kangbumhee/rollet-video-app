'use client';

import { useEffect, useState } from 'react';

interface CycleStatusProps {
  phase?: string;
  nextSlotTime?: string;
  prizeTitle?: string;
  prizeImageURL?: string;
}

export default function CycleStatus({ phase, nextSlotTime, prizeTitle, prizeImageURL }: CycleStatusProps) {
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });
  const [totalSeconds, setTotalSeconds] = useState(0);

  useEffect(() => {
    if (!nextSlotTime) return;

    const parseTarget = () => {
      // "2026-03-02 21:30 KST" 또는 "2026-03-02T21:30" 대응
      const cleaned = nextSlotTime.replace(' KST', '').replace('T', ' ');
      const [datePart, timePartRaw] = cleaned.split(' ');
      const timePart = (timePartRaw || '00:00').slice(0, 5);
      return new Date(`${datePart}T${timePart}:00+09:00`);
    };

    const target = parseTarget();

    const update = () => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
      setTotalSeconds(diff);
      setTimeLeft({
        minutes: Math.floor(diff / 60),
        seconds: diff % 60,
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextSlotTime]);

  const pad = (n: number) => String(n).padStart(2, '0');

  // IDLE / COOLDOWN: 큰 카운트다운 표시
  if (!phase || phase === 'IDLE' || phase === 'COOLDOWN') {
    // 진행률 (30분 = 1800초 기준)
    const maxSeconds = 1800;
    const progress = Math.max(0, Math.min(100, ((maxSeconds - totalSeconds) / maxSeconds) * 100));

    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full px-4">
        <p className="text-gray-400 text-sm mb-4 tracking-widest uppercase">다음 경품까지</p>

        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-2xl px-6 py-4 min-w-[100px] text-center">
            <span className="text-6xl sm:text-7xl font-black text-white tabular-nums tracking-tight">
              {pad(timeLeft.minutes)}
            </span>
            <p className="text-gray-500 text-xs mt-1">분</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
          </div>

          <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-2xl px-6 py-4 min-w-[100px] text-center">
            <span className="text-6xl sm:text-7xl font-black text-white tabular-nums tracking-tight">
              {pad(timeLeft.seconds)}
            </span>
            <p className="text-gray-500 text-xs mt-1">초</p>
          </div>
        </div>

        <div className="w-full max-w-xs h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-purple-400 text-sm font-mono">{nextSlotTime || '대기 중...'}</p>

        {prizeTitle && (
          <div className="mt-6 flex flex-col items-center gap-2">
            {prizeImageURL && (
              <img
                src={prizeImageURL}
                alt={prizeTitle}
                className="w-20 h-20 rounded-xl object-cover border-2 border-purple-500/30"
              />
            )}
            <p className="text-white font-semibold text-lg">{prizeTitle}</p>
            <span className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-xs">곧 시작!</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-2 bg-gray-800/60 backdrop-blur rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-green-400 text-sm font-semibold">{phase}</span>
      </div>
      {prizeTitle && <span className="text-white text-sm">{prizeTitle}</span>}
    </div>
  );
}
