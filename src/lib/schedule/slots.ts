// src/lib/schedule/slots.ts
import type { TimeSlot, DayScheduleConfig, TimePreset } from '@/types/schedule';

export function generateDaySlots(date: string): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      slots.push({
        id: `${date}_${time}`,
        date,
        time,
        hour,
        minute,
        enabled: false,
        roomId: null,
        prizeTitle: null,
        prizeImageURL: null,
        gameType: null,
        status: 'DISABLED',
      });
    }
  }

  return slots;
}

export function applyEnabledSlots(slots: TimeSlot[], config: DayScheduleConfig | null): TimeSlot[] {
  if (!config) return slots;

  return slots.map((slot) => {
    const isEnabled = config.enabledSlots.includes(slot.time);
    return {
      ...slot,
      enabled: isEnabled,
      status: isEnabled ? (slot.roomId ? slot.status : 'EMPTY') : 'DISABLED',
    };
  });
}

export const TIME_PRESETS: TimePreset[] = [
  {
    name: '점심 시간대',
    description: '11:00 ~ 14:00 (6개 슬롯)',
    slots: ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30'],
  },
  {
    name: '저녁 시간대',
    description: '18:00 ~ 22:00 (8개 슬롯)',
    slots: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'],
  },
  {
    name: '피크 타임',
    description: '12:00 ~ 14:00, 19:00 ~ 22:00 (10개 슬롯)',
    slots: ['12:00', '12:30', '13:00', '13:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'],
  },
  {
    name: '주간 풀타임',
    description: '09:00 ~ 23:00 (28개 슬롯)',
    slots: Array.from({ length: 28 }, (_, i) => {
      const totalMin = 9 * 60 + i * 30;
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }),
  },
  {
    name: '24시간 풀타임',
    description: '00:00 ~ 23:30 (48개 슬롯)',
    slots: Array.from({ length: 48 }, (_, i) => {
      const h = Math.floor(i / 2);
      const m = (i % 2) * 30;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }),
  },
];

export function parseSlotId(slotId: string): { date: string; time: string } {
  const [date, time] = slotId.split('_');
  return { date, time };
}

export function getTodayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

export function getDateRange(startDate: string, days: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}
