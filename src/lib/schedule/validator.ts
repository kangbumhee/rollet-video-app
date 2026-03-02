// src/lib/schedule/validator.ts
import type { TimeSlot } from '@/types/schedule';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDaySchedule(slots: TimeSlot[], availablePrizeCount: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const enabledSlots = slots.filter((s) => s.enabled);
  const assignedSlots = enabledSlots.filter((s) => s.roomId);
  const emptySlots = enabledSlots.filter((s) => !s.roomId);

  if (emptySlots.length > 0) {
    warnings.push(`${emptySlots.length}개 슬롯에 경품이 배정되지 않았습니다.`);
  }

  if (enabledSlots.length > availablePrizeCount + assignedSlots.length) {
    warnings.push(`활성 슬롯(${enabledSlots.length}개)이 사용 가능한 경품(${availablePrizeCount}개)보다 많습니다.`);
  }

  const enabledTimes = enabledSlots.map((s) => s.hour * 60 + s.minute).sort((a, b) => a - b);
  let maxGap = 0;
  for (let i = 1; i < enabledTimes.length; i++) {
    const gap = enabledTimes[i] - enabledTimes[i - 1];
    if (gap > maxGap) maxGap = gap;
  }
  if (maxGap > 120 && enabledSlots.length > 2) {
    warnings.push(`최대 ${maxGap}분 간격의 빈 시간이 있습니다. 시청자 이탈 가능성이 있습니다.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function isPastDate(date: string): boolean {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = kst.toISOString().split('T')[0];
  return date < today;
}

export function isPastSlot(date: string, time: string): boolean {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const slotTime = new Date(`${date}T${time}:00+09:00`);
  return slotTime.getTime() < kstNow.getTime();
}
