// src/components/admin/TimeSlotGrid.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TIME_PRESETS } from '@/lib/schedule/slots';
import { isPastSlot } from '@/lib/schedule/validator';
import type { TimeSlot } from '@/types/schedule';

interface TimeSlotGridProps {
  date: string;
  slots: TimeSlot[];
  onToggle: (slotId: string, enabled: boolean) => void;
  onSlotClick: (slot: TimeSlot) => void;
  onApplyPreset: (slotTimes: string[]) => void;
}

const STATUS_COLORS: Record<string, string> = {
  DISABLED: 'bg-gray-800 border-gray-700 text-gray-600',
  EMPTY: 'bg-gray-700 border-yellow-500/30 text-yellow-400',
  ASSIGNED: 'bg-green-900/30 border-green-500/50 text-green-400',
  LIVE: 'bg-red-900/30 border-red-500/50 text-red-400 animate-pulse',
  COMPLETED: 'bg-gray-800 border-gray-600 text-gray-500',
};

export function TimeSlotGrid({ date, slots, onToggle, onSlotClick, onApplyPreset }: TimeSlotGridProps) {
  const groups = [
    { label: '새벽 (00~05)', start: 0, end: 5 },
    { label: '오전 (06~11)', start: 6, end: 11 },
    { label: '오후 (12~17)', start: 12, end: 17 },
    { label: '저녁 (18~23)', start: 18, end: 23 },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium">빠른 설정</p>
        <div className="flex flex-wrap gap-2">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onApplyPreset(preset.slots)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300 transition-colors"
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            const allTimes = slots.map((s) => s.time);
            onApplyPreset(allTimes);
          }}
          className="px-3 py-1 bg-prize-600 hover:bg-prize-700 rounded text-xs text-white"
        >
          전체 선택
        </button>
        <button onClick={() => onApplyPreset([])} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white">
          전체 해제
        </button>
      </div>

      {groups.map((group) => {
        const groupSlots = slots.filter((s) => s.hour >= group.start && s.hour <= group.end);

        return (
          <div key={group.label}>
            <p className="text-xs text-gray-500 mb-2">{group.label}</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {groupSlots.map((slot) => {
                const past = isPastSlot(date, slot.time);
                const statusColor = STATUS_COLORS[slot.status] || STATUS_COLORS.DISABLED;

                return (
                  <button
                    key={slot.id}
                    onClick={() => {
                      if (past) return;
                      if (slot.enabled && slot.roomId) {
                        onSlotClick(slot);
                      } else {
                        onToggle(slot.id, !slot.enabled);
                      }
                    }}
                    disabled={past}
                    className={cn(
                      'relative border rounded-lg p-2 text-center transition-all',
                      statusColor,
                      past && 'opacity-30 cursor-not-allowed',
                      !past && 'hover:scale-105 cursor-pointer'
                    )}
                  >
                    <div className="text-xs font-mono font-bold">{slot.time}</div>
                    <div className="mt-1">
                      {slot.enabled ? <span className="text-[10px]">{slot.roomId ? '🎁' : '✅'}</span> : <span className="text-[10px] text-gray-600">—</span>}
                    </div>

                    {slot.prizeTitle && <p className="text-[8px] text-gray-400 truncate mt-0.5">{slot.prizeTitle}</p>}
                    {slot.status === 'LIVE' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
