// src/components/admin/ScheduleCalendar.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import type { CalendarDayData } from '@/types/schedule';

interface ScheduleCalendarProps {
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
}

export function ScheduleCalendar({ onSelectDate, selectedDate }: ScheduleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [dayData, setDayData] = useState<Record<string, CalendarDayData>>({});

  const loadMonthData = useCallback(async () => {
    const { year, month } = currentMonth;
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

    try {
      const res = await apiClient(`/api/schedule/slots?startDate=${startDate}&endDate=${endDate}&summary=true`);
      const data = (await res.json()) as { success?: boolean; summary?: Record<string, CalendarDayData> };
      if (data.success && data.summary) {
        setDayData(data.summary);
      }
    } catch {
      // silent
    }
  }, [currentMonth]);

  useEffect(() => {
    void loadMonthData();
  }, [loadMonthData]);

  const { year, month } = currentMonth;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  const todayStr = (() => {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().split('T')[0];
  })();

  const prevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-gray-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="text-gray-400 hover:text-white p-1">
          ◀
        </button>
        <h3 className="text-white font-bold">{monthName}</h3>
        <button onClick={nextMonth} className="text-gray-400 hover:text-white p-1">
          ▶
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
          <div
            key={day}
            className={cn('text-center text-xs font-medium py-1', i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500')}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isPast = dateStr < todayStr;
          const dd = dayData[dateStr];

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                'relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all',
                'hover:bg-gray-700/50',
                isSelected && 'ring-2 ring-prize-500 bg-prize-900/30',
                isToday && !isSelected && 'ring-1 ring-yellow-500',
                isPast && 'opacity-40'
              )}
            >
              <span className={cn('font-medium', isSelected ? 'text-prize-400' : isToday ? 'text-yellow-400' : 'text-white')}>{day}</span>

              {dd && dd.totalSlots > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dd.hasLive && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  {dd.assignedSlots > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                  {dd.totalSlots > dd.assignedSlots && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-500 justify-center">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> 라이브
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" /> 배정
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" /> 빈 슬롯
        </span>
      </div>
    </div>
  );
}
