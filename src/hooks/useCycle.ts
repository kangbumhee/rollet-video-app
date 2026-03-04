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
        setCycle(snap.val() as CycleState);
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
