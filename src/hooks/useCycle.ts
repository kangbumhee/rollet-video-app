'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { realtimeDb, firestore } from '@/lib/firebase/config';
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

    onValue(cycleRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.val() as CycleState;

        // nextSlot이 과거인지 확인
        if (data.nextSlot && (data.currentPhase === 'IDLE' || data.currentPhase === 'COOLDOWN')) {
          const isPast = isNextSlotPast(data.nextSlot);
          if (isPast) {
            // Firestore scheduleSlots에서 미래 슬롯 직접 조회
            try {
              const now = Date.now();
              const slotsRef = collection(firestore, 'scheduleSlots');
              const q = query(
                slotsRef,
                where('status', '==', 'ASSIGNED'),
                where('scheduledAt', '>', now),
                orderBy('scheduledAt', 'asc'),
                limit(1)
              );
              const snap2 = await getDocs(q);
              if (!snap2.empty) {
                const slotData = snap2.docs[0].data();
                const scheduledAt = slotData.scheduledAt as number;
                // scheduledAt → KST 문자열 (브라우저 로컬=KST면 getXxx 사용)
                const kstDate = new Date(scheduledAt);
                const y = kstDate.getFullYear();
                const mo = String(kstDate.getMonth() + 1).padStart(2, '0');
                const d = String(kstDate.getDate()).padStart(2, '0');
                const h = String(kstDate.getHours()).padStart(2, '0');
                const m = String(kstDate.getMinutes()).padStart(2, '0');
                data.nextSlot = `${y}-${mo}-${d} ${h}:${m} KST`;

                // 경품 정보도 가져오기
                if (slotData.prizeTitle) data.currentPrizeTitle = slotData.prizeTitle;
                if (slotData.prizeImageURL) data.currentPrizeImage = slotData.prizeImageURL;

                console.log('[useCycle] Corrected nextSlot from Firestore:', data.nextSlot);
              }
            } catch (e) {
              console.warn('[useCycle] Failed to fetch future slot from Firestore:', e);
            }
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

function isNextSlotPast(nextSlot: string | number): boolean {
  let ms: number;
  if (typeof nextSlot === 'number') {
    ms = nextSlot > 9_999_999_999 ? nextSlot : nextSlot * 1000;
  } else {
    const str = String(nextSlot).trim();
    if (/^\d{10,13}$/.test(str)) {
      const n = Number(str);
      ms = n > 9_999_999_999 ? n : n * 1000;
    } else {
      const cleaned = str.replace(/\s*KST\s*/i, '').replace('T', ' ').trim();
      const [datePart, timePart] = cleaned.split(' ');
      const t = (timePart || '00:00').slice(0, 5);
      ms = new Date(`${datePart}T${t}:00+09:00`).getTime();
    }
  }
  return !isNaN(ms) && ms < Date.now();
}
