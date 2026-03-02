// src/components/admin/ScheduleOverview.tsx
'use client';

import React from 'react';
import type { TimeSlot } from '@/types/schedule';

interface ScheduleOverviewProps {
  slots: TimeSlot[];
}

export function ScheduleOverview({ slots }: ScheduleOverviewProps) {
  const enabled = slots.filter((s) => s.enabled).length;
  const assigned = slots.filter((s) => s.status === 'ASSIGNED').length;
  const live = slots.filter((s) => s.status === 'LIVE').length;

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
        <p className="text-xs text-gray-400">활성 슬롯</p>
        <p className="text-white font-bold">{enabled}</p>
      </div>
      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
        <p className="text-xs text-gray-400">배정 슬롯</p>
        <p className="text-green-400 font-bold">{assigned}</p>
      </div>
      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
        <p className="text-xs text-gray-400">라이브</p>
        <p className="text-red-400 font-bold">{live}</p>
      </div>
    </div>
  );
}
