'use client';

import { useEffect, useState } from 'react';

interface CycleStatusProps {
  phase?: string;
  nextSlotTime?: string | number | null;
  prizeTitle?: string | null;
  prizeImageURL?: string | null;
  onPrizeClick?: () => void;
}

export default function CycleStatus({ phase, nextSlotTime, prizeTitle, prizeImageURL, onPrizeClick }: CycleStatusProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [targetMs, setTargetMs] = useState<number | null>(null);

  useEffect(() => {
    if (!nextSlotTime) { setTargetMs(null); return; }
    const raw = nextSlotTime;
    let ms: number | null = null;

    if (typeof raw === 'number') {
      ms = raw > 9_999_999_999 ? raw : raw * 1000;
    } else {
      const str = String(raw).trim();
      if (/^\d{10,13}$/.test(str)) {
        const n = Number(str);
        ms = n > 9_999_999_999 ? n : n * 1000;
      } else if (/T.*([Zz]|[+-]\d{2}:\d{2})/.test(str)) {
        ms = new Date(str).getTime();
      } else {
        const cleaned = str.replace(/\s*KST\s*/i, '').replace('T', ' ').trim();
        const [datePart, timePart] = cleaned.split(' ');
        const t = (timePart || '00:00').slice(0, 5);
        ms = new Date(`${datePart}T${t}:00+09:00`).getTime();
      }
    }

    if (ms && !isNaN(ms)) { setTargetMs(ms); }
    else { setTargetMs(null); }
  }, [nextSlotTime]);

  useEffect(() => {
    if (targetMs === null) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      setTotalSeconds(0);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
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
  }, [targetMs]);

  const pad = (n: number) => String(n).padStart(2, '0');

  if (!phase || phase === 'IDLE' || phase === 'COOLDOWN') {
    const maxSeconds = totalSeconds > 1800 ? totalSeconds : 1800;
    const progress = maxSeconds > 0 ? Math.max(0, Math.min(100, ((maxSeconds - totalSeconds) / maxSeconds) * 100)) : 0;
    const hasNextSlot = nextSlotTime && String(nextSlotTime).trim().length > 0;
    const isPast = totalSeconds === 0 && targetMs !== null && targetMs < Date.now();

    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full px-4">
        {hasNextSlot && !isPast ? (
          <>
            <p className="text-white/30 text-sm mb-4 tracking-widest uppercase">다음 경품까지</p>
            <div className="flex items-center gap-4 mb-4">
              {/* 제품 이미지 — 왼쪽 */}
              {prizeImageURL && String(prizeImageURL).length > 0 ? (
                <button onClick={onPrizeClick} className="shrink-0 flex flex-col items-center gap-1 group cursor-pointer">
                  <img src={prizeImageURL} alt={prizeTitle || '경품'}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-neon-amber/30 neon-glow-amber group-hover:scale-105 transition-transform" />
                  {prizeTitle && <p className="text-neon-amber text-[11px] font-semibold text-center max-w-[80px] truncate">{prizeTitle}</p>}
                </button>
              ) : prizeTitle ? (
                <button onClick={onPrizeClick} className="shrink-0 flex flex-col items-center gap-1 cursor-pointer">
                  <div className="w-20 h-20 rounded-xl bg-neon-amber/10 border-2 border-neon-amber/20 flex items-center justify-center">
                    <span className="text-3xl">🎁</span>
                  </div>
                  <p className="text-neon-amber text-[11px] font-semibold text-center max-w-[80px] truncate">{prizeTitle}</p>
                </button>
              ) : null}

              {/* 타이머 — 오른쪽 */}
              <div className="flex items-center gap-2">
                {timeLeft.hours > 0 && (
                  <>
                    <div className="bg-surface-base/80 backdrop-blur border border-white/[0.06] rounded-2xl px-3 py-2 min-w-[56px] text-center">
                      <span className="text-3xl font-black text-white tabular-nums font-score">{pad(timeLeft.hours)}</span>
                      <p className="text-white/20 text-[9px] mt-0.5">시간</p>
                    </div>
                    <span className="text-neon-magenta text-xl font-bold">:</span>
                  </>
                )}
                <div className="bg-surface-base/80 backdrop-blur border border-white/[0.06] rounded-2xl px-3 py-2 min-w-[56px] text-center">
                  <span className={`font-black text-white tabular-nums font-score ${timeLeft.hours > 0 ? 'text-3xl' : 'text-4xl'}`}>{pad(timeLeft.minutes)}</span>
                  <p className="text-white/20 text-[9px] mt-0.5">분</p>
                </div>
                <span className="text-neon-magenta text-xl font-bold">:</span>
                <div className="bg-surface-base/80 backdrop-blur border border-white/[0.06] rounded-2xl px-3 py-2 min-w-[56px] text-center">
                  <span className={`font-black text-white tabular-nums font-score ${timeLeft.hours > 0 ? 'text-3xl' : 'text-4xl'}`}>{pad(timeLeft.seconds)}</span>
                  <p className="text-white/20 text-[9px] mt-0.5">초</p>
                </div>
              </div>
            </div>
            <div className="w-full max-w-xs h-2 bg-surface-base rounded-full overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-neon-magenta to-neon-cyan rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <p className="text-white/20 text-sm">다음 경품 일정을 준비 중입니다...</p>
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
      {prizeTitle && <span className="text-white text-sm">{prizeTitle}</span>}
    </div>
  );
}
