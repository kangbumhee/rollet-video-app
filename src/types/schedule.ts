// src/types/schedule.ts

export interface TimeSlot {
  id: string;
  date: string;
  time: string;
  hour: number;
  minute: number;
  enabled: boolean;
  roomId: string | null;
  prizeTitle: string | null;
  prizeImageURL: string | null;
  gameType: string | null;
  status: SlotStatus;
}

export type SlotStatus = 'EMPTY' | 'ASSIGNED' | 'LIVE' | 'COMPLETED' | 'DISABLED';

export interface DayScheduleConfig {
  date: string;
  enabledSlots: string[];
  updatedAt: number;
  updatedBy: string;
}

export interface CalendarDayData {
  date: string;
  totalSlots: number;
  assignedSlots: number;
  completedSlots: number;
  hasLive: boolean;
}

export interface TimePreset {
  name: string;
  description: string;
  slots: string[];
}
