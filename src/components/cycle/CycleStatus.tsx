'use client';

import { useEffect, useState } from 'react';

interface CycleStatusProps {
  phase?: string;
  nextSlotTime?: string | number | null;
  prizeTitle?: string | null;
  prizeImageURL?: string | null;
}

export default function CycleStatus({ phase, nextSlotTime, prizeTitle, prizeImageURL }: CycleStatusProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [targetMs, setTargetMs] = useState<number | null>(null);

  // nextSlotTime이 바뀔 때 target 밀리초를 한 번만 계산
  useEffect(() => {
    if (!nextSlotTime) {
      setTargetMs(null);
      return;
    }

    const raw = nextSlotTime;
    let ms: number | null = null;

    // 1) 숫자 (Unix timestamp) — ms 또는 초
    if (typeof raw === 'number') {
      ms = raw > 9_999_999_999 ? raw : raw * 1000;
    } else {
      const str = String(raw).trim();

      // 2) 순수 숫자 문자열
      if (/^\d{10,13}$/.test(str)) {
        const n = Number(str);
        ms = n > 9_999_999_999 ? n : n * 1000;
      }
      // 3) ISO with timezone  "2026-03-04T20:00:00+09:00" or "...Z"
      else if (/T.*([Zz]|[+-]\d{2}:\d{2})/.test(str)) {
        ms = new Date(str).getTime();
      }
      // 4) "2026-03-04 20:00 KST" or "2026-03-04T20:00"
      else {
        const cleaned = str.replace(/\s*KST\s*/i, '').replace('T', ' ').trim();
        const [datePart, timePart] = cleaned.split(' ');
        const t = (timePart || '00:00').slice(0, 5);
        ms = new Date(`${datePart}T${t}:00+09:00`).getTime();
      }
    }

    if (ms && !isNaN(ms)) {
      console.log('[CycleStatus] parsed target:', new Date(ms).toISOString(), 'from raw:', raw);
      setTargetMs(ms);
    } else {
      console.error('[CycleStatus] Failed to parse nextSlotTime:', raw);
      setTargetMs(null);
    }
  }, [nextSlotTime]);

  // 매초 카운트다운 업데이트
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

  // IDLE / COOLDOWN: 큰 카운트다운 표시
  if (!phase || phase === 'IDLE' || phase === 'COOLDOWN') {
    const maxSeconds = totalSeconds > 1800 ? totalSeconds : 1800;
    const progress = maxSeconds > 0 ? Math.max(0, Math.min(100, ((maxSeconds - totalSeconds) / maxSeconds) * 100)) : 0;
    const hasNextSlot = nextSlotTime && String(nextSlotTime).trim().length > 0;

    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full px-4">
        {hasNextSlot ? (
          <>
            <p className="text-white/30 text-sm mb-4 tracking-widest uppercase">다음 경품까지</p>

            {/* ── 제품사진(왼쪽) + 타이머(오른쪽) 가로 배치 ── */}
            <div className="flex items-center gap-4 mb-4">
              {/* 제품 이미지 — 왼쪽 */}
              {prizeImageURL && String(prizeImageURL).length > 0 ? (
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <img
                    src={prizeImageURL}
                    alt={prizeTitle || '경품'}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-neon-amber/30 neon-glow-amber"
                  />
                  {prizeTitle && (
                    <p className="text-neon-amber text-[11px] font-semibold text-center max-w-[80px] truncate">{prizeTitle}</p>
                  )}
                </div>
              ) : prizeTitle ? (
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className="w-20 h-20 rounded-xl bg-neon-amber/10 border-2 border-neon-amber/20 flex items-center justify-center">
                    <span className="text-3xl">🎁</span>
                  </div>
                  <p className="text-neon-amber text-[11px] font-semibold text-center max-w-[80px] truncate">{prizeTitle}</p>
                </div>
              ) : null}

              {/* 타이머 — 오른쪽 */}
              <div className="flex items-center gap-2">
                {timeLeft.hours > 0 && (
                  <>
                    <div className="bg-surface-base/80 backdrop-blur border border-white/[0.06] rounded-2xl px-4 py-3 min-w-[60px] text-center">
                      <span className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight font-score">
                        {pad(timeLeft.hours)}
                      </span>
                      <p className="text-white/20 text-[10px] mt-1">시간</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-neon-magenta animate-pulse" />
                      <div className="w-1.5 h-1.5 rounded-full bg-neon-magenta animate-pulse" />
                    </div>
                  </>
                )}
                <div className="bg-surface-base/80 backdrop-blur border border-white/[0.06] rounded-2xl px-4 py-3 min-w-[60px] text-center">
                  <span className={`font-black text-white tabular-nums tracking-tight font-score ${timeLeft.hours > 0 ? 'text-3xl sm:text-4xl' : 'text-5xl sm:text-6xl'}`}>
                    {pad(timeLeft.minutes)}
                  </span>
                  <p className="text-white/20 text-[10px] mt-1">분</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-magenta animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-magenta animate-pulse" />
                </div>
                <div className="bg-surface-base/80 backdrop-blur border border-white/[0.06] rounded-2xl px-4 py-3 min-w-[60px] text-center">
                  <span className={`font-black text-white tabular-nums tracking-tight font-score ${timeLeft.hours > 0 ? 'text-3xl sm:text-4xl' : 'text-5xl sm:text-6xl'}`}>
                    {pad(timeLeft.seconds)}
                  </span>
                  <p className="text-white/20 text-[10px] mt-1">초</p>
                </div>
              </div>
            </div>

            {/* 프로그레스 바 */}
            <div className="w-full max-w-xs h-2 bg-surface-base rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-neon-magenta to-neon-cyan rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>

            {totalSeconds > 0 ? (
              <p className="text-neon-amber text-sm font-score">{String(nextSlotTime)}</p>
            ) : (
              <p className="text-white/20 text-sm">다음 경품 일정을 준비 중입니다...</p>
            )}
          </>
        ) : (
          <p className="text-white/20 text-sm">예정된 경품 게임이 없습니다</p>
        )}
      </div>
    );
  }

  // 다른 페이즈 (ANNOUNCING, GAME_PLAYING 등)
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
