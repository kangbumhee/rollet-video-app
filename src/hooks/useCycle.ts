// src/hooks/useCycle.ts
'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase/config';
import type { CycleState } from '@/types/cycle';

interface UseCycleReturn {
  cycle: CycleState | null;
  isLoading: boolean;
  phaseRemaining: number;
  isLive: boolean;
}

export function useCycle(roomId: string): UseCycleReturn {
  void roomId;
  const [cycle, setCycle] = useState<CycleState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phaseRemaining, setPhaseRemaining] = useState(0);

  useEffect(() => {
    const cycleRef = ref(realtimeDb, 'cycle/main');
    onValue(cycleRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val() as CycleState;

        // nextSlot이 과거 시간이면 30분 뒤로 자동 보정
        if (data.nextSlot && (data.currentPhase === 'IDLE' || data.currentPhase === 'COOLDOWN')) {
          const cleaned = data.nextSlot.replace(' KST', '').replace('T', ' ').trim();
          const [datePart, timePart] = cleaned.split(' ');
          const tp = (timePart || '00:00').slice(0, 5);
          const target = new Date(`${datePart}T${tp}:00+09:00`);

          if (target.getTime() < Date.now()) {
            // 현재 시각 기준으로 다음 30분 슬롯 계산
            const now = new Date();
            const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
            const m = kstNow.getUTCMinutes();
            let slotH = kstNow.getUTCHours();
            let slotM: number;
            if (m < 30) { slotM = 30; } else { slotM = 0; slotH += 1; }

            const y = kstNow.getUTCFullYear();
            let mo = kstNow.getUTCMonth();
            let d = kstNow.getUTCDate();
            if (slotH >= 24) {
              slotH -= 24;
              const nextDay = new Date(Date.UTC(y, mo, d + 1));
              mo = nextDay.getUTCMonth();
              d = nextDay.getUTCDate();
            }

            data.nextSlot = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')} KST`;
          }
        }

        setCycle(data);
      } else {
        setCycle(null);
      }
      setIsLoading(false);
    });

    return () => off(cycleRef);
  }, []);

  useEffect(() => {
    if (!cycle?.phaseEndsAt) {
      setPhaseRemaining(0);
      return;
    }

    const tick = () => {
      const diff = Math.max(0, Math.ceil((cycle.phaseEndsAt - Date.now()) / 1000));
      setPhaseRemaining(diff);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cycle?.phaseEndsAt]);

  const isLive = cycle?.currentPhase !== 'IDLE' && cycle?.currentPhase !== 'COOLDOWN';

  return { cycle, isLoading, phaseRemaining, isLive: Boolean(isLive) };
}
