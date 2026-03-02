// src/components/cycle/NextPrizeCountdown.tsx
'use client';

import React, { useState, useEffect } from 'react';

interface NextPrizeCountdownProps {
  nextSlot: string | null;
}

export function NextPrizeCountdown({ nextSlot }: NextPrizeCountdownProps) {
  const [remaining, setRemaining] = useState({ min: 0, sec: 0 });

  useEffect(() => {
    if (!nextSlot) return;

    const tick = () => {
      const target = new Date(`${nextSlot}:00+09:00`).getTime();
      const diff = Math.max(0, target - Date.now());
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setRemaining({ min, sec });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextSlot]);

  if (!nextSlot) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <span className="text-4xl mb-3">⏳</span>
        <p className="text-sm">다음 경품을 준비하고 있습니다</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 bg-gray-800/30 rounded-xl">
      <p className="text-sm text-gray-400 mb-3">다음 경품까지</p>
      <div className="flex items-center gap-2">
        <div className="bg-gray-800 rounded-lg px-4 py-2 min-w-[60px] text-center">
          <span className="text-2xl font-bold text-white">{String(remaining.min).padStart(2, '0')}</span>
          <p className="text-[10px] text-gray-500">분</p>
        </div>
        <span className="text-xl text-gray-500 animate-pulse">:</span>
        <div className="bg-gray-800 rounded-lg px-4 py-2 min-w-[60px] text-center">
          <span className="text-2xl font-bold text-white">{String(remaining.sec).padStart(2, '0')}</span>
          <p className="text-[10px] text-gray-500">초</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3">{nextSlot.replace('T', ' ')} KST</p>
    </div>
  );
}
