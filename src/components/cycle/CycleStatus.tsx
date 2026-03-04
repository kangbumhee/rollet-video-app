'use client';

import { useEffect, useState } from 'react';

interface CycleStatusProps {
  phase?: string;
  nextSlotTime?: string | null;
  prizeTitle?: string | null;
  prizeImageURL?: string | null;
}

export default function CycleStatus({ phase, nextSlotTime, prizeTitle, prizeImageURL }: CycleStatusProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [totalSeconds, setTotalSeconds] = useState(0);

  useEffect(() => {
    if (!nextSlotTime) return;

    const parseTarget = () => {
      const raw = nextSlotTime!;
      console.log('[CycleStatus] nextSlotTime raw:', raw, typeof raw);

      // 1) 숫자(Unix timestamp ms)인 경우
      if (typeof raw === 'number' || /^\d{10,13}$/.test(String(raw).trim())) {
        const ts = Number(raw);
        return new Date(ts > 9999999999 ? ts : ts * 1000);
      }

      // 2) ISO 형식 "2026-03-04T20:00:00+09:00" 등
      if (String(raw).includes('T') && (String(raw).includes('Z') || /[+-]\d{2}:\d{2}$/.test(String(raw)))) {
        return new Date(String(raw));
      }

      // 3) "2026-03-04 20:00 KST" 또는 "2026-03-04T20:00" 형식
      const cleaned = String(raw)
        .replace(' KST', '')
        .replace('T', ' ')
        .trim();
      const parts = cleaned.split(' ');
      const datePart = parts[0] || '';
      const timePart = (parts[1] || '00:00').slice(0, 5);
      return new Date(`${datePart}T${timePart}:00+09:00`);
    };

    const target = parseTarget();

    if (isNaN(target.getTime())) {
      console.error('[CycleStatus] Invalid nextSlotTime:', nextSlotTime);
      return;
    }

    console.log('[CycleStatus] target:', target.toISOString(), 'now:', new Date().toISOString(), 'diff:', Math.floor((target.getTime() - Date.now()) / 1000), 'sec');

    const update = () => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
      setTotalSeconds(diff);
      setTimeLeft({
        hours: Math.floor(diff / 3600),
        minutes: Math.floor((diff % 3600) / 60),
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
    const maxSeconds = totalSeconds > 1800 ? totalSeconds : 1800;
    const progress = Math.max(0, Math.min(100, ((maxSeconds - totalSeconds) / maxSeconds) * 100));
    const hasNextSlot = nextSlotTime && String(nextSlotTime).trim().length > 0;

    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full px-4">
        {hasNextSlot ? (
          <>
            <p className="text-white/30 text-sm mb-4 tracking-widest uppercase">다음 경품까지</p>
            <div className="flex items-center gap-2 mb-4">
              {timeLeft.hours > 0 && (
                <>
                  <div className="bg-surface-base/80 backdrop-blur border border-white/[0.06] rounded-2xl px-4 py-3 min-w-[72px] text-center">
                    <span className="text-4xl sm:text-5xl font-black text-white tabular-nums tracking-tight font-score">
                      {pad(timeLeft.hours)}
                    </span>
                    <p className="text-white/20 text-[10px] mt-1">시간</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-neon-magenta animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-neon-magenta animate-pulse" />
                  </div>
                </>
              )}
              <div className="bg-surface-base/80 backdrop-blur border border-white/[0.06] rounded-2xl px-4 py-3 min-w-[72px] text-center">
                <span className={`font-black text-white tabular-nums tracking-tight font-score ${timeLeft.hours > 0 ? 'text-4xl sm:text-5xl' : 'text-6xl sm:text-7xl'}`}>
                  {pad(timeLeft.minutes)}
                </span>
                <p className="text-white/20 text-[10px] mt-1">분</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="w-2 h-2 rounded-full bg-neon-magenta animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-neon-magenta animate-pulse" />
              </div>
              <div className="bg-surface-base/80 backdrop-blur border border-white/[0.06] rounded-2xl px-4 py-3 min-w-[72px] text-center">
                <span className={`font-black text-white tabular-nums tracking-tight font-score ${timeLeft.hours > 0 ? 'text-4xl sm:text-5xl' : 'text-6xl sm:text-7xl'}`}>
                  {pad(timeLeft.seconds)}
                </span>
                <p className="text-white/20 text-[10px] mt-1">초</p>
              </div>
            </div>
            <div className="w-full max-w-xs h-2 bg-surface-base rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-neon-magenta to-neon-cyan rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            {totalSeconds > 0 ? (
              <p className="text-neon-amber text-sm font-score">{nextSlotTime}</p>
            ) : (
              <p className="text-white/20 text-sm">다음 경품 일정을 준비 중입니다...</p>
            )}
          </>
        ) : (
          <p className="text-white/20 text-sm">예정된 경품 게임이 없습니다</p>
        )}

        {prizeTitle && String(prizeTitle).length > 0 && (
          <div className="mt-6 flex flex-col items-center gap-2">
            {prizeImageURL && String(prizeImageURL).length > 0 && (
              <img
                src={prizeImageURL}
                alt={prizeTitle}
                className="w-20 h-20 rounded-xl object-cover border-2 border-neon-amber/30 neon-glow-amber"
              />
            )}
            <p className="text-white font-semibold text-lg">{prizeTitle}</p>
            <span className="px-3 py-1 bg-neon-magenta/15 text-neon-magenta rounded-full text-xs neon-border-magenta">곧 시작!</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-2 bg-surface-base/60 backdrop-blur rounded-xl border border-white/[0.06] flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-400 text-sm font-semibold">{phase}</span>
      </div>
      {prizeTitle && String(prizeTitle).length > 0 && <span className="text-white text-sm">{prizeTitle}</span>}
    </div>
  );
}
