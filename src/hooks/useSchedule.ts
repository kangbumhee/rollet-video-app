// src/hooks/useSchedule.ts
'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import type { TimeSlot, DayScheduleConfig } from '@/types/schedule';

interface UseScheduleReturn {
  slots: TimeSlot[];
  config: DayScheduleConfig | null;
  isLoading: boolean;
  error: string | null;
  loadDay: (date: string) => Promise<void>;
  toggleSlot: (slotId: string, enabled: boolean) => Promise<void>;
  assignPrize: (slotId: string, roomId: string) => Promise<void>;
  unassignPrize: (slotId: string) => Promise<void>;
  applyPreset: (date: string, slotTimes: string[]) => Promise<void>;
  saveConfig: (date: string, enabledSlots: string[]) => Promise<void>;
}

export function useSchedule(): UseScheduleReturn {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [config, setConfig] = useState<DayScheduleConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDay = useCallback(async (date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient(`/api/schedule/slots?date=${date}`);
      const data = (await res.json()) as {
        success?: boolean;
        slots?: TimeSlot[];
        config?: DayScheduleConfig | null;
        error?: string;
      };
      if (data.success) {
        setSlots(data.slots || []);
        setConfig(data.config || null);
      } else {
        setError(data.error || '스케줄을 불러오지 못했습니다.');
      }
    } catch {
      setError('스케줄을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleSlot = useCallback(async (slotId: string, enabled: boolean) => {
    try {
      const res = await apiClient('/api/schedule/toggle', {
        method: 'POST',
        body: JSON.stringify({ slotId, enabled }),
      });
      const data = (await res.json()) as { success?: boolean };
      if (data.success) {
        setSlots((prev) =>
          prev.map((s) => (s.id === slotId ? { ...s, enabled, status: enabled ? (s.roomId ? 'ASSIGNED' : 'EMPTY') : 'DISABLED' } : s))
        );
      }
    } catch {
      setError('슬롯 토글 실패');
    }
  }, []);

  const assignPrize = useCallback(async (slotId: string, roomId: string) => {
    try {
      const res = await apiClient('/api/schedule/assign', {
        method: 'POST',
        body: JSON.stringify({ slotId, roomId }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        prizeTitle?: string;
        prizeImageURL?: string;
        gameType?: string;
        error?: string;
      };
      if (data.success) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  roomId,
                  prizeTitle: data.prizeTitle || null,
                  prizeImageURL: data.prizeImageURL || null,
                  gameType: data.gameType || null,
                  status: 'ASSIGNED',
                }
              : s
          )
        );
      } else {
        setError(data.error || '경품 배정 실패');
      }
    } catch {
      setError('경품 배정 실패');
    }
  }, []);

  const unassignPrize = useCallback(async (slotId: string) => {
    try {
      const res = await apiClient('/api/schedule/assign', {
        method: 'DELETE',
        body: JSON.stringify({ slotId }),
      });
      const data = (await res.json()) as { success?: boolean };
      if (data.success) {
        setSlots((prev) =>
          prev.map((s) => (s.id === slotId ? { ...s, roomId: null, prizeTitle: null, prizeImageURL: null, gameType: null, status: 'EMPTY' } : s))
        );
      }
    } catch {
      setError('배정 해제 실패');
    }
  }, []);

  const applyPreset = useCallback(
    async (date: string, slotTimes: string[]) => {
      try {
        const res = await apiClient('/api/schedule/slots', {
          method: 'POST',
          body: JSON.stringify({ date, enabledSlots: slotTimes }),
        });
        const data = (await res.json()) as { success?: boolean };
        if (data.success) {
          await loadDay(date);
        }
      } catch {
        setError('프리셋 적용 실패');
      }
    },
    [loadDay]
  );

  const saveConfig = useCallback(async (date: string, enabledSlots: string[]) => {
    try {
      const res = await apiClient('/api/schedule/slots', {
        method: 'POST',
        body: JSON.stringify({ date, enabledSlots }),
      });
      const data = (await res.json()) as { success?: boolean; config?: DayScheduleConfig; error?: string };
      if (data.success) {
        setConfig(data.config || null);
      } else {
        setError(data.error || '설정 저장 실패');
      }
    } catch {
      setError('설정 저장 실패');
    }
  }, []);

  return {
    slots,
    config,
    isLoading,
    error,
    loadDay,
    toggleSlot,
    assignPrize,
    unassignPrize,
    applyPreset,
    saveConfig,
  };
}
